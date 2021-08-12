import { applyTransactionsAsync, Operation, Transcation } from '@app/hooks/useCommit'
import { fetchBlock, fetchUser } from '@app/api'
import debug from 'debug'
import invariant from 'tiny-invariant'
import { cloneDeep } from 'lodash'
import { nanoid } from 'nanoid'
import { atomFamily, DefaultValue, selectorFamily, Snapshot } from 'recoil'
import type { Editor } from '@app/types'
import { subscribeBlockUpdate } from '@app/utils/remoteStoreObserver'
import { WorkspaceIdAtom } from '../hooks/useWorkspaceIdAtom'

export type BlockSnapshot = Map<string, Editor.BaseBlock>
export const TelleryBlockMap: BlockSnapshot = new Map()

export const blockUpdater = (newValue: Editor.BaseBlock | DefaultValue, oldValue: Editor.BaseBlock | DefaultValue) => {
  if (newValue instanceof DefaultValue) {
    return oldValue
  } else {
    if (oldValue instanceof DefaultValue) {
      return newValue
    } else if (newValue.version > oldValue.version) {
      return newValue
    } else {
      return oldValue
    }
  }
}

export const TelleryBlockAtom = atomFamily<Editor.BaseBlock, string>({
  key: 'TelleryBlockAtom',
  // default: null,
  default: selectorFamily({
    key: 'TelleryBlockAtom/Default',
    get:
      (blockId: string) =>
      async ({ get }) => {
        const workspaceId = get(WorkspaceIdAtom)
        invariant(workspaceId, 'workspaceId is null')
        const response = await fetchBlock(blockId, workspaceId)
        return response
      }
  }),
  effects_UNSTABLE: (blocId: string) => [
    (param) => {
      const onSet = (newValue: Editor.BaseBlock | DefaultValue, oldValue: Editor.BaseBlock | DefaultValue) => {
        const value = blockUpdater(newValue, oldValue)
        if (value instanceof DefaultValue === false) {
          TelleryBlockMap.set(blocId, value as Editor.BaseBlock)
        }
        return value
      }
      param.onSet(onSet)

      const unsubscribe = subscribeBlockUpdate(blocId, (newValue) => {
        param.setSelf((oldValue) => onSet(newValue, oldValue))
      })
      return () => {
        unsubscribe()
      }
    }
  ]
})

export const TelleryStoryBlocks = selectorFamily<Record<string, Editor.BaseBlock>, string>({
  key: 'TelleryStoryBlocks',
  get:
    (storyId) =>
    ({ get }) => {
      const result: Record<string, Editor.BaseBlock> = {}
      const nodeStack = [storyId]

      while (nodeStack.length !== 0) {
        const currentNodeId = nodeStack.pop()
        invariant(currentNodeId, 'currentNodeId is null')
        const currentNode = get(TelleryBlockAtom(currentNodeId))
        result[currentNodeId] = currentNode
        const children = currentNode.children ?? []
        nodeStack.push(...children)
      }

      return result
    }
})

export const TelleryUserAtom = atomFamily({
  key: 'TelleryUserAtom',
  default: selectorFamily({
    key: 'TelleryUserAtom/Default',
    get:
      (userId: string | null) =>
      async ({ get }) => {
        if (!userId) {
          return undefined
        }
        const workspaceId = get(WorkspaceIdAtom)
        invariant(workspaceId, 'workspaceId is null')
        const response = await fetchUser(userId, workspaceId)
        return response
      }
  })
})

export const logger = debug('tellery:api')

// export const printBlockTree = (rootId: string) => {
//   function printBranch(blockId: string, branch: string) {
//     try {
//       const block = getBlockFromGlobalStore(blockId)
//       const isGraphHead = branch.length === 0
//       const children = block.children || []

//       let branchHead = ''

//       if (!isGraphHead) {
//         branchHead = children && children.length !== 0 ? '┬ ' : '─ '
//       }

//       logger(`${branch}${branchHead}${block.id}-${block.type}`)

//       let baseBranch = branch

//       if (!isGraphHead) {
//         const isChildOfLastBranch = branch.slice(-2) === '└─'
//         baseBranch = branch.slice(0, -2) + (isChildOfLastBranch ? '  ' : '│ ')
//       }

//       const nextBranch = baseBranch + '├─'
//       const lastBranch = baseBranch + '└─'

//       children.forEach((child, index) => {
//         printBranch(child, children.length - 1 === index ? lastBranch : nextBranch)
//       })
//     } catch (e) {
//       logger(`block not ready`)
//     }
//   }

//   printBranch(rootId, '')
// }

export const getBlockFromSnapshot = (blockId: string, snapshot: BlockSnapshot): Editor.BaseBlock => {
  const block = snapshot.get(blockId)
  invariant(block, `blockLoadable ${blockId} is undefined`)
  return block
}

export const getBlockFromStoreMap = (blockId: string, snapshot: BlockSnapshot): Editor.BaseBlock | undefined => {
  return snapshot.get(blockId)
}

export const getBlockFromSnapshotAsync = async (blockId: string, snapshot: Snapshot) => {
  const targetBlock = await snapshot.getPromise(TelleryBlockAtom(blockId))
  return targetBlock ? cloneDeep(targetBlock) : undefined
}

export const useGetBlockContent = () => {
  return (blockId: string) => TelleryBlockMap.get(blockId)
}

export const useBlockSnapshot = () => {
  return TelleryBlockMap
}

export const createUserLogOperation = (entityId: string, type: 'EDIT' | 'CREATE', userId: string): Operation => {
  return {
    cmd: 'update',
    id: entityId,
    path: [type === 'CREATE' ? 'createdById' : 'lastEditedById'],
    table: 'block',
    args: userId ?? null
  }
}

export const applyCreateSnapshotOperation = async (props: {
  snapshotId: string
  questionId: string
  sql: string
  data?: unknown
  workspaceId: string
}) => {
  const { snapshotId, data, sql, questionId, workspaceId } = props
  const transactions: Transcation[] = [
    {
      workspaceId,
      id: nanoid(),
      operations: [
        {
          cmd: 'set',
          args: {
            alive: true,
            id: snapshotId,
            questionId: questionId,
            sql: sql,
            data: data
          },
          path: [],
          id: snapshotId,
          table: 'snapshot'
        }
      ]
    }
  ]
  return applyTransactionsAsync(transactions)
}
