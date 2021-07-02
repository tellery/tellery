import { TelleryStorySelectionAtom } from '@app/components/editor/store/selection'
import { createTranscation } from '@app/context/editorTranscations'
import { useWorkspace } from '@app/context/workspace'
import {
  BlockSnapshot,
  createUserLogOperation,
  getBlockFromStoreMap,
  logger,
  TelleryBlockAtom,
  TelleryBlockMap
} from '@app/store/block'
import { Editor, TellerySelection } from '@app/types'
import invariant from 'invariant'
import { cloneDeep, throttle } from 'lodash'
import { useContext, useMemo, createContext } from 'react'
import { toast } from 'react-toastify'
import { CallbackInterface, useRecoilCallback } from 'recoil'
import update from 'immutability-helper'

import { useLoggedUser } from './useAuth'
import saveTranscations, { request } from '@app/api'

const UNDO_STACK: Record<string, { selection: TellerySelection | null; transcation: Transcation }[]> = {}

const REDO_STACK: Record<string, { selection: TellerySelection | null; transcation: Transcation }[]> = {}

export interface Operation {
  cmd: string
  id: string
  path: string[]
  table: string
  args: unknown
}

export interface Transcation {
  id: string
  workspaceId: string
  operations: Operation[]
}

const undo = ({
  storyId,
  userId,
  recoilCallback
}: {
  storyId: string
  userId: string
  recoilCallback: CallbackInterface
}): TellerySelection | null | undefined => {
  const record = UNDO_STACK[storyId]?.pop()
  if (!record) {
    return
  }
  const { transcation, selection } = record
  logger('commit undo transcation ', transcation)

  try {
    startTranscation()
    // recoilCallback.set(TelleryStorySelectionAtom(storyId), null)
    const [patchedOperations, reversedOperations] = applyOperations(transcation.operations, {
      recoilCallback,
      shouldReformat: false,
      userId
    })
    // recoilCallback.set(TelleryStorySelectionAtom(storyId), selection)
    if (!REDO_STACK[storyId]) {
      REDO_STACK[storyId] = []
    }
    REDO_STACK[storyId].push({
      selection: selection,
      transcation: { ...createTranscation({ operations: reversedOperations }), workspaceId: transcation.workspaceId }
    })
    appendTransaction({ ...transcation, operations: patchedOperations })

    endTranscation()
    logger('undo commit transcation end', transcation)

    return selection
  } catch (err) {
    endTranscation()
    toast.error(`commit failed. reason: ${err}`)
    logger('undo commit transcation end', transcation)
    return selection
  }
}

const redo = ({
  storyId,
  userId,
  recoilCallback
}: {
  storyId: string
  recoilCallback: CallbackInterface
  userId: string
}): TellerySelection | null | undefined => {
  const record = REDO_STACK[storyId]?.pop()
  if (!record) {
    return
  }
  const { transcation, selection } = record
  logger('commit redo transcation', transcation)
  startTranscation()

  const [patchedOperations, reversedOperations] = applyOperations(transcation.operations, {
    recoilCallback,
    userId,
    shouldReformat: false
  })
  if (!UNDO_STACK[storyId]) {
    UNDO_STACK[storyId] = []
  }
  UNDO_STACK[storyId].push({
    selection: selection,
    transcation: { ...createTranscation({ operations: reversedOperations }), workspaceId: transcation.workspaceId }
  })
  appendTransaction({ ...transcation, operations: patchedOperations })
  recoilCallback.set(TelleryStorySelectionAtom(storyId), selection)

  endTranscation()
  logger('redo commit transcation end', transcation)
  return selection
}

const TranscationPromiseMap: Record<string, { resolve: (value: unknown) => void; reject: (value: unknown) => void }> =
  {}

export interface CommitInterface {
  storyId: string
  transcation:
    | Omit<Transcation, 'workspaceId'>
    | ((snapshot: typeof TelleryBlockMap) => Omit<Transcation, 'workspaceId'>)
  recoilCallback: CallbackInterface
  shouldReformat?: boolean
  userId: string
  workspaceId: string
}

let isTranscationPending = false
let operations: Operation[] = []

export const startTranscation = () => {
  invariant(isTranscationPending === false, 'a transcation is already in progress')
  isTranscationPending = true
}

export const endTranscation = async () => {
  if (operations.length === 0) {
    isTranscationPending = false
    return
  }

  operations = []
  isTranscationPending = false
}
export const appendOperation = (_operations: Operation[]) => {
  operations.push(..._operations)
}

// FIXME: commit order
export const commit = async ({
  storyId,
  userId,
  transcation: transcationOrGenerator,
  recoilCallback,
  workspaceId,
  shouldReformat = true
}: CommitInterface) => {
  const transcation =
    typeof transcationOrGenerator === 'function'
      ? { ...transcationOrGenerator(TelleryBlockMap), workspaceId }
      : { ...transcationOrGenerator, workspaceId }
  logger('commit transcation', transcation)
  try {
    startTranscation()

    const { contents: selection } = recoilCallback!.snapshot.getLoadable(TelleryStorySelectionAtom(storyId))
    const [patchedOperations, reversedOperations] = applyOperations(transcation.operations, {
      recoilCallback,
      shouldReformat,
      userId
    })
    logger('revered operations', reversedOperations)
    if (!UNDO_STACK[storyId]) {
      UNDO_STACK[storyId] = []
    }
    UNDO_STACK[storyId].push({
      selection: selection,
      transcation: { ...createTranscation({ operations: reversedOperations }), workspaceId }
    })
    if (REDO_STACK[storyId]?.length) {
      REDO_STACK[storyId].length = 0
    }
    appendTransaction({ ...transcation, operations: patchedOperations })

    endTranscation()

    logger('commit transcation end', transcation)
    return new Promise((resolve, reject) => {
      TranscationPromiseMap[transcation.id] = {
        resolve,
        reject
      }
    })
  } catch (err) {
    endTranscation()
    return Promise.reject(err)
  }
}

export const useCommitHistory = (userId: string, storyId: string) => {
  const redoCallback = useRecoilCallback(
    (recoilCallback) => () => {
      return redo({ recoilCallback, storyId, userId: userId })
    },
    [storyId, userId]
  )
  const undoCallback = useRecoilCallback(
    (recoilCallback) => () => {
      invariant(userId, 'userId is null')
      return undo({ recoilCallback, storyId, userId: userId })
    },
    [storyId, userId]
  )

  return useMemo(() => ({ redo: redoCallback, undo: undoCallback }), [redoCallback, undoCallback])
}

export const useCommitProvider = () => {
  const user = useLoggedUser()
  const workspace = useWorkspace()
  const callbackedCommit = useRecoilCallback(
    (recoilCallback) => (commitOptions: Omit<CommitInterface, 'recoilCallback' | 'userId' | 'workspaceId'>) => {
      logger('callback commit')
      invariant(user.id, 'userId is null')
      return commit({ ...commitOptions, recoilCallback, userId: user.id, workspaceId: workspace.id })
    }
  )
  return callbackedCommit
}

export const CommitContext = createContext<ReturnType<typeof useCommitProvider> | null>(null)
// export const BlockTranscationsContext = React.createContext<ReturnType<typeof useBlockTranscationProvider> | null>(null)

export const useCommit = () => {
  const commit = useContext(CommitContext)

  invariant(commit, 'useCommit must use in context')

  return commit
}
export const applyOperations = (
  _operations: Operation[],
  options: { storyId?: string; recoilCallback: CallbackInterface; shouldReformat?: boolean; userId: string }
) => {
  const { recoilCallback, shouldReformat = true, userId } = options
  const updatedVersionsSet = new Set<string>()
  const updatedStoriesSet = new Set<string>()
  const normalizeLayoutBlockSet = new Set<string>()

  const operations = cloneDeep(_operations)
  const reversedOperations: Operation[] = []

  logger('operations', operations)

  const tempMap = new Map(TelleryBlockMap)

  // const newSnapshot = recoilCallback.snapshot.map((snapshot) => {
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i]

    const currentBlock = getBlockFromStoreMap(operation.id, tempMap)
    const isNewCreated = currentBlock === undefined ?? !currentBlock?.createdById
    logger('currentblock', currentBlock)
    let updatedBlock = cloneDeep(currentBlock)

    switch (operation.cmd) {
      case 'set':
      case 'update': {
        const getProp = (data: Record<string, any>, path: string[]): any => {
          if (path.length) {
            return getProp(data[path[0]], path.slice(1))
          } else {
            return cloneDeep(data)
          }
        }

        const updateProp = (data: Record<string, any>, path: string[], value: any): any => {
          if (path.length) {
            return {
              ...data,
              [path[0]]: updateProp(data[path[0]], path.slice(1), value)
            }
          } else {
            return value
          }
        }

        if (!updatedBlock) {
          reversedOperations.push({
            cmd: 'update',
            path: ['alive'],
            args: false,
            table: 'block',
            id: operation.id
          })
        } else {
          if (operation.path?.[0] !== 'lastEditedById' && operation.path?.[0] !== 'createdById') {
            reversedOperations.push({
              cmd: 'update',
              path: operation.path,
              args: getProp(updatedBlock, operation.path),
              table: 'block',
              id: operation.id
            })
          }
        }

        updatedBlock = updateProp(updatedBlock ?? {}, operation.path, operation.args)

        break
      }
      case 'listRemove': {
        logger(operation)
        invariant(updatedBlock, 'Block is not defined')
        invariant(updatedBlock.children, 'no children')
        const index = updatedBlock.children.findIndex((id) => id === (operation.args as any).id)
        invariant(index !== -1, 'child not found')

        const beforeId = updatedBlock.children[index - 1]
        reversedOperations.push({
          cmd: 'listBefore',
          path: operation.path,
          args: { id: (operation.args as any).id, before: beforeId },
          table: 'block',
          id: operation.id
        })

        updatedBlock = update(updatedBlock, {
          children: {
            $splice: [[index, 1]]
          }
        })

        shouldReformat && pushReformatColumnsOperations(operations, i, updatedBlock)
        shouldReformat && normalizeLayoutBlockSet.add(updatedBlock.id)
        break
      }
      case 'listAfter':
      case 'listBefore': {
        logger('list after or before', operation, updatedBlock)
        invariant(updatedBlock, 'Block is not defined')
        if (updatedBlock.children === undefined) {
          updatedBlock = { ...updatedBlock, children: [] }
        }

        reversedOperations.push({
          cmd: 'listRemove',
          path: operation.path,
          args: { id: (operation.args as any).id },
          table: 'block',
          id: operation.id
        })

        invariant(updatedBlock.children, 'children is undefined')
        if (operation.cmd === 'listAfter') {
          invariant((operation.args as any).after, 'after id must not be undefined')

          const index = updatedBlock.children.findIndex((id) => id === (operation.args as any).after)

          logger('listafter', index)

          updatedBlock = update(updatedBlock, {
            children: {
              $splice: [[index === -1 ? updatedBlock.children.length : index + 1, 0, (operation.args as any).id]]
            }
          })

          logger('listafter', updatedBlock)
        } else {
          const index = updatedBlock.children.findIndex((id) => id === (operation.args as any).before)

          updatedBlock = update(updatedBlock, {
            children: {
              $splice: [[index === -1 ? 0 : index, 0, (operation.args as any).id]]
            }
          })
        }

        shouldReformat && pushReformatColumnsOperations(operations, i, updatedBlock)

        operations.splice(i + 1, 0, {
          cmd: 'update',
          id: (operation.args as any).id,
          args: updatedBlock.id,
          table: 'block',
          path: ['parentId']
        })
        break
      }
      default:
        invariant(false, 'invalid operations cmd')
    }

    invariant(updatedBlock, 'updatedBlock is still undefined')

    if (updatedVersionsSet.has(operation.id) === false) {
      const storyId = updatedBlock.storyId

      invariant(storyId, 'storyId is undefined')

      if (isNewCreated) {
        operations.push(createUserLogOperation(operation.id, 'CREATE', userId))
      }

      if (updatedStoriesSet.has(storyId) === false) {
        operations.push(createUserLogOperation(storyId, 'EDIT', userId))
        updatedStoriesSet.add(storyId)
      }

      // if (block.type !== Editor.BlockType.Story) {
      invariant(typeof updatedBlock.version === 'number', `version is not number ${updatedBlock.version}`)
      if (updatedBlock.type !== Editor.BlockType.Story) {
        operations.push(createUserLogOperation(operation.id, 'EDIT', userId))
      }

      logger('updateblock', updatedBlock?.id, updatedBlock)

      updatedBlock = { ...updatedBlock, version: updatedBlock.version + 1 }

      logger('update version', operation.id, updatedBlock.version)
      updatedVersionsSet.add(operation.id)
    }

    if (i === operations.length - 1) {
      normalizeLayoutBlockSet.forEach((id) => {
        appendNormalizeLayoutOperations(operations, i, id, tempMap)
        normalizeLayoutBlockSet.delete(id)
      })
    }

    tempMap.set(updatedBlock.id, { ...updatedBlock })
  }

  for (const blockId of updatedVersionsSet) {
    const updatedBlock = tempMap.get(blockId)
    logger('updating ', blockId, updatedBlock)
    invariant(updatedBlock, 'update block is null')
    recoilCallback.set(TelleryBlockAtom(blockId), updatedBlock)
    TelleryBlockMap.set(blockId, updatedBlock as Editor.BaseBlock)
  }

  logger('set', updatedVersionsSet)

  return [operations, reversedOperations.reverse()]
}

export const applyTransactionsAsync = (transactions: Transcation[]) => {
  return request.post('/api/operations/saveTransactions', {
    transactions: transactions
  })
}

export const TRANSACTIONS_KEY = 'tellery:transactions'

let isSyncing = false
export const syncStory = throttle(() => {
  if (isSyncing === true) {
    return
  }
  isSyncing = true
  const transactions = localStorage.getItem(TRANSACTIONS_KEY)
  if (!transactions) {
    isSyncing = false
    return
  }
  const parsedTransactions: Transcation[] = JSON.parse(transactions)
  localStorage.removeItem(TRANSACTIONS_KEY)
  return saveTranscations(parsedTransactions)
    .then((res) => {
      parsedTransactions.forEach((transaction) => {
        TranscationPromiseMap[transaction.id].resolve(res)
      })
    })
    .catch((err) => {
      parsedTransactions.forEach((transaction) => {
        TranscationPromiseMap[transaction.id].reject(err)
      })
    })
    .finally(() => {
      isSyncing = false
      syncStory()
    })
}, 450)

export const appendTransaction = (transaction: Transcation) => {
  console.info('transaction', JSON.stringify(transaction.operations))
  const transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]')
  transactions.push(transaction)
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions))
  syncStory()
}

const appendNormalizeLayoutOperations = async (
  operations: Operation[],
  index: number,
  id: string,
  snapshot: BlockSnapshot
) => {
  const _operations: Operation[] = []
  const layoutBlock = getBlockFromStoreMap(id, snapshot)
  invariant(layoutBlock, 'block is undefined')

  if (layoutBlock.type === Editor.BlockType.Column || layoutBlock.type === Editor.BlockType.Row) {
    if (layoutBlock.children?.length === 0) {
      _operations.push({
        cmd: 'listRemove',
        id: layoutBlock.parentId,
        args: { id: layoutBlock.id },
        table: 'block',
        path: ['children']
      })
      _operations.push({
        cmd: 'update',
        id: layoutBlock.id,
        args: false,
        table: 'block',
        path: ['alive']
      })
    }
    if (layoutBlock.type === Editor.BlockType.Row && layoutBlock.children?.length === 1) {
      const columnBlock = getBlockFromStoreMap(layoutBlock.children[0], snapshot)
      invariant(columnBlock, 'block is undefined')
      let previousBlockId = layoutBlock.id
      columnBlock.children?.forEach((id) => {
        _operations.push({
          cmd: 'listAfter',
          id: layoutBlock.parentId,
          args: { id: id, after: previousBlockId },
          table: 'block',
          path: ['children']
        })
        _operations.push({
          cmd: 'listRemove',
          id: columnBlock.id,
          args: { id },
          table: 'block',
          path: ['children']
        })
        previousBlockId = id
      })
    }
  }
  operations.splice(index + 1, 0, ..._operations)
}

const pushReformatColumnsOperations = (operations: Operation[], index: number, rowBlock: Editor.Block) => {
  const _operations: Operation[] = []
  if (rowBlock.type === Editor.BlockType.Row) {
    rowBlock.children?.forEach((id) => {
      _operations.push({
        cmd: 'update',
        id: id,
        args: {
          width: 1 / rowBlock.children!.length
        },
        table: 'block',
        path: ['format']
      })
    })
  }
  operations.splice(index + 1, 0, ..._operations)
}
