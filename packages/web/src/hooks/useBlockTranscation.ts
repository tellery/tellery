import saveTranscations from '@app/api'
import {
  createTranscation,
  duplicateStoryTranscation,
  getDuplicatedBlocks,
  insertBlocksAndMoveTranscation,
  moveBlocksTranscation
} from '@app/context/editorTranscations'
import { useWorkspace } from '@app/context/workspace'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { getBlockFromSnapshot } from '@app/store/block'
import { Editor, Permission } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import debug from 'debug'
import invariant from 'invariant'
import { nanoid } from 'nanoid'
import React, { useCallback, useContext } from 'react'
import { Operation, useCommit } from './useCommit'

export const logger = debug('tellery:blocktranscations')

export const useBlockTranscationProvider = () => {
  const commit = useCommit()
  const workspace = useWorkspace()

  const moveBlocks = useCallback(
    (storyId, { blockIds, targetBlockId, direction }) => {
      return commit({
        transcation: (snapshot) =>
          moveBlocksTranscation({
            storyId,
            sourceBlockIds: blockIds,
            targetBlockId,
            direction,
            deleteSourceBlock: true,
            snapshot
          }),
        storyId
      })
    },
    [commit]
  )
  const duplicateBlocks = useCallback(
    (
      storyId: string,
      {
        blockIds,
        targetBlockId,
        direction,
        duplicate
      }: {
        blockIds: string[]
        targetBlockId: string
        direction: 'top' | 'left' | 'bottom' | 'right' | 'child'
        duplicate: boolean
      }
    ) => {
      return commit({
        transcation: (snapshot) => {
          const blocks = blockIds.map((blockId) => getBlockFromSnapshot(blockId, snapshot))
          return insertBlocksAndMoveTranscation({
            storyId,
            blocks: duplicate ? getDuplicatedBlocks(blocks, storyId) : blocks,
            targetBlockId,
            direction,
            duplicate: duplicate,
            snapshot
          })
        },
        storyId
      })
    },
    [commit]
  )
  const createNewStory = useCallback(
    async (props?: { id: string; title?: string }) => {
      const id = props?.id ? props.id : nanoid()
      const title = props?.title ? props.title : undefined
      return commit({
        storyId: id,
        transcation: createTranscation({
          operations: [
            {
              cmd: 'set',
              id: id,
              path: [],
              table: 'block',
              args: createEmptyBlock({
                id: id,
                parentId: workspace.id,
                parentTable: Editor.BlockParentType.WORKSPACE,
                format: {},
                content: { title: title ? [[title]] : [] },
                children: [],
                type: Editor.BlockType.Story,
                storyId: id
              })
            }
          ]
        })
      })
    },
    [commit, workspace.id]
  )

  const insertBlocks = useCallback(
    (
      storyId: string,
      {
        blocks,
        targetBlockId,
        direction
      }: {
        blocks: Editor.BaseBlock[]
        targetBlockId: string
        direction: 'top' | 'left' | 'bottom' | 'right' | 'child'
      }
    ) => {
      return commit({
        transcation: (snapshot) => {
          logger('insert block')
          return insertBlocksAndMoveTranscation({
            storyId,
            blocks: blocks,
            targetBlockId,
            direction,
            duplicate: true,
            snapshot
          })
        },
        storyId
      })
    },
    [commit]
  )

  const removeBlocks = useCallback(
    (storyId: string, targetBlockIds: string[]) => {
      return commit({
        transcation: (snapshot) => {
          const operations: Operation[] = []
          targetBlockIds.forEach((targetId) => {
            const targetBlock = getBlockFromSnapshot(targetId, snapshot)
            operations.push(
              ...[
                {
                  cmd: 'listRemove',
                  id: targetBlock.parentId,
                  path: ['children'],
                  args: { id: targetBlock.id },
                  table: 'block'
                },
                {
                  cmd: 'update',
                  id: targetId,
                  path: ['alive'],
                  args: false,
                  table: 'block'
                }
              ]
            )
          })

          return createTranscation({ operations: operations })
        },
        storyId
      })
    },
    [commit]
  )

  const updateBlockPermissions = useCallback(
    (storyId: string, permissions: Permission[]) => {
      return commit({
        storyId: storyId,
        transcation: createTranscation({
          operations: [
            {
              cmd: 'setPermissions',
              id: storyId,
              args: permissions,
              path: ['permissions'],
              table: 'block'
            }
          ]
        })
      })
    },
    [commit]
  )

  // TODO: use commit
  const pinStory = useCallback((workspaceViewId: string, storyId: string) => {
    return saveTranscations([
      {
        ...createTranscation({
          operations: [
            {
              cmd: 'listBefore',
              table: 'workspaceView',
              id: workspaceViewId,
              args: {
                id: storyId
              },
              path: ['pinnedList']
            }
          ]
        }),
        workspaceId: workspace.id
      }
    ])
  }, [])

  // TODO: use commit
  const unpinStory = useCallback((workspaceViewId: string, storyId: string) => {
    return saveTranscations([
      {
        ...createTranscation({
          operations: [
            {
              cmd: 'listRemove',
              table: 'workspaceView',
              id: workspaceViewId,
              args: {
                id: storyId
              },
              path: ['pinnedList']
            }
          ]
        }),
        workspaceId: workspace.id
      }
    ])
  }, [])

  const deleteStory = useCallback(
    (storyId: string) => {
      return commit({
        storyId: storyId,
        transcation: createTranscation({
          operations: [
            {
              cmd: 'update',
              table: 'block',
              id: storyId,
              args: false,
              path: ['alive']
            }
          ]
        })
      })
    },
    [commit]
  )

  const duplicateStory = useCallback(
    async (storyId: string, newStoryId: string) => {
      // const newStoryId: string = ''
      return commit({
        transcation: (snapshot) => {
          const transcation = duplicateStoryTranscation({ storyId, snapshot, newStoryId, wroskapceId: workspace.id })
          // newStoryId = storyId
          return transcation
        },
        storyId: storyId,
        shouldReformat: false
      })
    },
    [commit, workspace.id]
  )

  return {
    duplicateBlocks,
    moveBlocks,
    createNewStory,
    removeBlocks,
    insertBlocks,
    updateBlockPermissions,
    pinStory,
    unpinStory,
    deleteStory,
    duplicateStory
  }
}

export const BlockTranscationsContext = React.createContext<ReturnType<typeof useBlockTranscationProvider> | null>(null)

export const useBlockTranscations = () => {
  const context = useContext(BlockTranscationsContext)
  invariant(context, 'useBlockTranscations must use in provider')
  return context
}
