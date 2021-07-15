import { sqlRequest } from '@app/api'
import { useWorkspace } from '@app/context/workspace'
import { createTranscation } from 'context/editorTranscations'
import invariant from 'invariant'
import { nanoid } from 'nanoid'
import React, { useCallback, useContext, useEffect, useMemo } from 'react'
import { useIsMutating, useQueryClient } from 'react-query'
import { applyCreateSnapshotOperation } from 'store/block'
import { Editor, Story } from 'types'
import { useCommit } from './useCommit'
import { useStoryBlocksMap } from './useStoryBlock'

export const useRefreshSnapshot = () => {
  const commit = useCommit()
  const workspace = useWorkspace()
  const queryClient = useQueryClient()

  const execute = useCallback(
    (questionBlock: Editor.QuestionBlock) => {
      const originalBlockId = questionBlock.id
      const sql = questionBlock.content?.sql ?? ''

      queryClient.executeMutation({
        mutationFn: sqlRequest,
        variables: {
          workspaceId: workspace.id,
          sql,
          questionId: originalBlockId,
          connectorId: workspace.preferences.connectorId!,
          profile: workspace.preferences.profile!
        },
        mutationKey: ['story', questionBlock.storyId, questionBlock.id, originalBlockId].join('/'),
        onSuccess: async (data) => {
          if (typeof data !== 'object' || data.errMsg) {
            // const snapshotId = questionBlock.content!.snapshotId
            commit({
              storyId: questionBlock.storyId!,
              transcation: createTranscation({
                operations: [
                  {
                    cmd: 'update',
                    id: originalBlockId,
                    path: ['content', 'lastRunAt'],
                    table: 'block',
                    args: Date.now()
                  },
                  {
                    cmd: 'update',
                    id: originalBlockId,
                    path: ['content', 'error'],
                    table: 'block',
                    args: data.errMsg ?? data
                  }
                ]
              })
            })
            return
          }
          const snapshotId = nanoid()
          await applyCreateSnapshotOperation({
            snapshotId,
            questionId: originalBlockId,
            sql: sql,
            data: data,
            workspaceId: workspace.id
          })
          commit({
            storyId: questionBlock.storyId!,
            transcation: createTranscation({
              operations: [
                {
                  cmd: 'update',
                  id: originalBlockId,
                  path: ['content', 'lastRunAt'],
                  table: 'block',
                  args: Date.now()
                },
                {
                  cmd: 'update',
                  id: originalBlockId,
                  path: ['content', 'error'],
                  table: 'block',
                  args: ''
                },
                {
                  cmd: 'update',
                  id: originalBlockId,
                  path: ['content', 'snapshotId'],
                  table: 'block',
                  args: snapshotId
                }
              ]
            })
          })
        }
      })
    },
    [commit, queryClient, workspace.id, workspace.preferences.connectorId, workspace.preferences.profile]
  )

  const cancel = useCallback(
    (blockId) => {
      const mutations = queryClient.getMutationCache().getAll()
      mutations
        .filter((mutation) => (mutation.options.mutationKey as string)?.endsWith(blockId))
        .forEach((mutation) => {
          queryClient.getMutationCache().remove(mutation)
        })
      // executeSQL.reset()
    },
    [queryClient]
  )

  const snapshotMutation = useMemo<SnapshotMutation>(
    () => ({
      execute,
      cancel
    }),
    [cancel, execute]
  )

  return snapshotMutation
}

export const useStorySnapshotManagerProvider = (storyId: string) => {
  const storyBlocksMap = useStoryBlocksMap(storyId)

  const questionBlocks = useMemo(() => {
    if (!storyBlocksMap) return []
    return Object.values(storyBlocksMap).filter((block) => block.type === Editor.BlockType.Question)
  }, [storyBlocksMap])

  const refreshSnapshot = useRefreshSnapshot()

  const runAll = useCallback(() => {
    questionBlocks.forEach((questionBlock: Editor.QuestionBlock) => {
      refreshSnapshot.execute(questionBlock)
    })
  }, [questionBlocks, refreshSnapshot])

  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string)?.startsWith(`story/${storyId}`)
  })

  return useMemo(
    () => ({
      total: questionBlocks.length,
      mutating: refreshingSnapshot,
      runAll
    }),
    [questionBlocks.length, refreshingSnapshot, runAll]
  )
}

export const StorySnapshotMangerContext = React.createContext<ReturnType<
  typeof useStorySnapshotManagerProvider
> | null>(null)

export const useStorySnapshotManager = () => {
  const context = useContext(StorySnapshotMangerContext)
  invariant(context, 'useBlockTranscations must use in provider')
  return context
}

export const useSnapshotMutating = (originalBlockId: string) => {
  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string)?.endsWith(originalBlockId)
  })

  return refreshingSnapshot
}

export interface SnapshotMutation {
  execute: (questionBlock: Editor.QuestionBlock) => void
  cancel: (blockId: string) => void
}
