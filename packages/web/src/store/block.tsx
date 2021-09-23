import { fetchBlock, fetchSnapshot, fetchUser } from '@app/api'
import type { Data } from '@app/components/v11n/types'
import { applyTransactionsAsync, Operation, Transcation } from '@app/hooks/useCommit'
import { Editor, Snapshot } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { subscribeBlockUpdate } from '@app/utils/remoteStoreObserver'
import debug from 'debug'
import { dequal } from 'dequal'
import { cloneDeep } from 'lodash'
import { atomFamily, DefaultValue, selectorFamily, useRecoilCallback, Snapshot as RecoilSnapshot } from 'recoil'
import invariant from 'tiny-invariant'
import { WorkspaceIdAtom } from '../hooks/useWorkspace'

export type BlockSnapshot = Map<string, Editor.BaseBlock>

export const TelleryBlockMap: BlockSnapshot = new Map()

export const blockUpdater = (newValue: Editor.Block | DefaultValue, oldValue: Editor.BaseBlock | DefaultValue) => {
  if (newValue instanceof DefaultValue) {
    return oldValue
  } else {
    if (oldValue instanceof DefaultValue) {
      return newValue
    } else if (newValue.version > oldValue.version) {
      return {
        ...newValue,
        content: dequal(newValue.content, oldValue.content) ? oldValue.content : newValue.content,
        format: dequal(newValue.format, oldValue.format) ? oldValue.format : newValue.format,
        permissions: dequal(newValue.permissions, oldValue.permissions) ? oldValue.permissions : newValue.permissions
      }
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
      },
    cachePolicy_UNSTABLE: {
      eviction: 'most-recent'
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

export const BlockTypeAtom = selectorFamily({
  key: 'blockTypeAtom',
  get:
    (blockId: string) =>
    ({ get }) => {
      const atom = get(TelleryBlockAtom(blockId))
      return atom.type
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const BlockTitleAtom = selectorFamily({
  key: 'blockTitleAtom',
  get:
    (blockId: string) =>
    ({ get }) => {
      const atom = get(TelleryBlockAtom(blockId))
      return atom.content?.title
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const BlockFormatAtom = selectorFamily({
  key: 'blockFormatAtom',
  get:
    (blockId: string) =>
    ({ get }) => {
      const atom = get(TelleryBlockAtom(blockId))
      return atom.format
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const BlockPermissionsAtom = selectorFamily({
  key: 'blockPermissionsAtom',
  get:
    (blockId: string) =>
    ({ get }) => {
      const atom = get(TelleryBlockAtom(blockId))
      return atom.permissions
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const TellerySnapshotAtom = atomFamily<Snapshot | null, string | null>({
  key: 'TellerySnapshotAtom',
  default: selectorFamily({
    key: 'TellerySnapshotAtom/Default',
    get:
      (snapshotId: string | null) =>
      async ({ get }) => {
        if (!snapshotId) return null
        const workspaceId = get(WorkspaceIdAtom)
        invariant(workspaceId, 'workspaceId is null')
        const response = await fetchSnapshot(snapshotId, workspaceId)
        return response
      },
    cachePolicy_UNSTABLE: {
      eviction: 'most-recent'
    }
  })
})

export const QuerySnapshotIdAtom = atomFamily<string | null, { storyId: string | null; blockId: string | null }>({
  key: 'QuerySnapshotIdAtom',
  default: selectorFamily({
    key: 'QuerySnapshotIdAtom/Default',
    get:
      ({ storyId, blockId }) =>
      ({ get }) => {
        if (!blockId) return null
        const queryBlock = get(TelleryBlockAtom(blockId)) as Editor.QueryBlock
        invariant(queryBlock, 'workspaceId is null')
        const snapshotId = queryBlock.content?.snapshotId ?? null
        return snapshotId
      },
    cachePolicy_UNSTABLE: {
      eviction: 'most-recent'
    }
  })
})

export const QuerySnapshotAtom = atomFamily<Snapshot | null, { storyId: string | null; blockId: string | null }>({
  key: 'QuerySnapshotAtom',
  default: selectorFamily({
    key: 'QuerySnapshotAtom/Default',
    get:
      ({ blockId, storyId }) =>
      ({ get }) => {
        if (!blockId) return null
        const snapshotId = get(QuerySnapshotIdAtom({ blockId, storyId }))
        if (snapshotId) {
          const snapshot = get(TellerySnapshotAtom(snapshotId))
          return snapshot
        }
        return null
      },
    cachePolicy_UNSTABLE: {
      eviction: 'most-recent'
    }
  })
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
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const StoryQueryVisualizationBlocksAtom = selectorFamily<
  Editor.VisualizationBlock[],
  { storyId: string; queryId: string }
>({
  key: 'StoryQueryVisualizationBlocksAtom',
  get:
    ({ storyId, queryId }) =>
    ({ get }) => {
      const result: Editor.VisualizationBlock[] = []
      const blocksMap = get(TelleryStoryBlocks(storyId))

      Object.values(blocksMap).forEach((block) => {
        const currentNode = block
        if (
          currentNode.type === Editor.BlockType.Visualization &&
          (currentNode as Editor.VisualizationBlock).content?.queryId === queryId
        ) {
          result.push(currentNode as Editor.VisualizationBlock)
        }
      })

      return result
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
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
      },
    cachePolicy_UNSTABLE: {
      eviction: 'most-recent'
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

export const getBlockFromStoreMap = (blockId: string, snapshot: BlockSnapshot): Editor.Block | undefined => {
  return snapshot.get(blockId)
}

export const getBlockFromSnapshotAsync = async (blockId: string, snapshot: RecoilSnapshot) => {
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

export const useCreateSnapshot = () => {
  const create = useRecoilCallback(
    (recoilcallback) =>
      async (props: { snapshotId: string; questionId: string; sql: string; data?: unknown; workspaceId: string }) => {
        const { snapshotId, data, sql, questionId, workspaceId } = props

        const transactions: Transcation[] = [
          {
            workspaceId,
            id: blockIdGenerator(),
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
        recoilcallback.set(TellerySnapshotAtom(snapshotId), {
          id: snapshotId,
          data: data as Data,
          sql
        })
        return applyTransactionsAsync(transactions)
      },
    []
  )
  return create
}
