import { sqlRequest } from '@app/api'
import { isExecuteableBlockType } from '@app/components/editor/Blocks/utils'
import { QuerySelectorFamily } from '@app/components/editor/store/queries'
import { charts } from '@app/components/v11n/charts'
import { Data, Type } from '@app/components/v11n/types'
import { createTranscation } from '@app/context/editorTranscations'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { QuerySnapshotIdAtom, useCreateSnapshot } from '@app/store/block'
import { Editor, Story } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import dayjs from 'dayjs'
import { dequal } from 'dequal'
import { isEqual } from 'lodash'
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useIsMutating, useQueryClient } from 'react-query'
import { useRecoilCallback, useRecoilValue, waitForAll } from 'recoil'
import invariant from 'tiny-invariant'
import { useBlockSuspense, useFetchStoryChunk, useGetBlock, useGetSnapshot } from './api'
import { useCommit } from './useCommit'
import { useGetQuerySql } from './useGetQuerySql'
import { useQuestionEditorActiveIdState } from './useQuestionEditor'
import { useStoryBlocksMap } from './useStoryBlock'
import { useStoryPermissions } from './useStoryPermissions'
import { useStoryResources } from './useStoryResources'

const getJsonSize = (json: string) => {
  return new Blob([json]).size
}

const limitRecordsBySize = (data: Data, sizeLimit: number) => {
  let upperBoundary = data.records.length
  let lowerBoundary = 0
  let cursor = upperBoundary

  while (true) {
    const trimedData = {
      ...data,
      records: data.records.slice(0, cursor)
    } as Data
    const size = getJsonSize(JSON.stringify(trimedData))
    if (size >= sizeLimit) {
      upperBoundary = cursor - 1
    } else {
      if (upperBoundary - cursor <= 1) {
        return trimedData
      }
      lowerBoundary = cursor
    }
    cursor = Math.floor((upperBoundary + lowerBoundary) / 2)
  }
}

export const useRefreshSnapshot = (storyId: string) => {
  const storyBlock = useBlockSuspense<Story>(storyId)
  const commit = useCommit()
  const workspace = useWorkspace()
  const queryClient = useQueryClient()
  const createSnapshot = useCreateSnapshot()
  const getSnapshot = useGetSnapshot()
  const getBlock = useGetBlock()
  const getQuerySql = useGetQuerySql()
  const connectorId = storyBlock.format?.connectorId ?? workspace.preferences.connectorId
  const execute = useRecoilCallback(
    ({ set, reset }) =>
      async (queryBlock: Editor.QueryBlock) => {
        const originalBlockId = queryBlock.id
        const { sql, isTemp } = await getQuerySql(storyId, queryBlock)
        const mutations = queryClient
          .getMutationCache()
          .getAll()
          .filter(
            (mutation) =>
              (mutation.options.mutationKey as string)?.endsWith(originalBlockId) && mutation.state.status === 'loading'
          )
        mutations.forEach((mutation) => {
          mutation.cancel()
        })

        // TODO: a workaround to sql exectue multiple time with empty sql content
        if (sql.length === 0) return { data: {}, isTemp, errMsg: null }

        return queryClient.executeMutation({
          mutationFn: sqlRequest,
          variables: {
            workspaceId: workspace.id,
            sql,
            questionId: originalBlockId,
            connectorId: connectorId!
          },
          mutationKey: ['story', queryBlock.storyId, queryBlock.id, originalBlockId].join('/'),
          onSuccess: async (data) => {
            if (typeof data !== 'object' || data.errMsg) {
              // const snapshotId = questionBlock.content!.snapshotId
              commit({
                storyId: queryBlock.storyId!,
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
            const snapshotId = blockIdGenerator()
            await createSnapshot({
              snapshotId,
              questionId: originalBlockId,
              sql: sql,
              // TODO: Temporary remove the data size limit, it seems causes limit data records length to 1
              // data: limitRecordsBySize(data, 10 * 1024 * 1024),
              data: data,
              workspaceId: workspace.id
            })
            const prevSnapshot = await getSnapshot({ snapshotId: queryBlock?.content?.snapshotId })
            if (!isEqual(prevSnapshot?.data.fields, data.fields)) {
              const visualizationBlock = (await getBlock(queryBlock.parentId)) as Editor.VisualizationBlock
              const dimensions =
                queryBlock.type === Editor.BlockType.SmartQuery
                  ? (queryBlock as Editor.SmartQueryBlock).content.dimensions
                  : undefined
              commit({
                storyId: storyId!,
                transcation: createTranscation({
                  operations: [
                    {
                      cmd: 'update',
                      id: queryBlock.parentId,
                      path: ['content', 'visualization'],
                      table: 'block',
                      args: charts[visualizationBlock.content?.visualization?.type || Type.TABLE].initializeConfig(
                        data,
                        { cache: {}, dimensions }
                      )
                    }
                  ]
                })
              })
            }
            if (isTemp) {
              set(QuerySnapshotIdAtom({ blockId: queryBlock.id }), snapshotId)
            } else {
              reset(QuerySnapshotIdAtom({ blockId: queryBlock.id }))
              commit({
                storyId: storyId!,
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
          }
        })
      },
    [getQuerySql, storyId, queryClient, workspace.id, connectorId, createSnapshot, getSnapshot, commit, getBlock]
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

  const snapshotMutation = useMemo(
    () => ({
      execute,
      cancel
    }),
    [cancel, execute]
  )

  return snapshotMutation
}
function usePreviousCompare<T>(value: T) {
  const ref = useRef<null | typeof value>()
  useEffect(() => {
    if (dequal(ref.current, value) === false) {
      ref.current = value
    }
  }, [value])

  return ref.current as T
}

export const useStorySnapshotManagerProvider = (storyId: string) => {
  useFetchStoryChunk(storyId)
  const storyBlock = useBlockSuspense<Story>(storyId)
  const resourcesBlocks = useStoryResources(storyId)
  const queryClient = useQueryClient()
  const [activeId] = useQuestionEditorActiveIdState(storyId)
  const storyBlocksMap = useStoryBlocksMap(storyId)
  const currentActiveQueryBlockId = useRef<string | null>(null)
  useEffect(() => {
    if (!storyBlocksMap || !activeId) return
    const activeQuestionBlock = storyBlocksMap[activeId] as Editor.VisualizationBlock
    if (!activeQuestionBlock) {
      currentActiveQueryBlockId.current = null
    } else {
      currentActiveQueryBlockId.current = activeQuestionBlock.content?.queryId!
    }
  }, [storyBlocksMap, activeId])
  const executeableQuestionBlocks = useMemo(() => {
    return resourcesBlocks.filter((block) => isExecuteableBlockType(block.type))
  }, [resourcesBlocks])

  const compiledQueries = useRecoilValue(
    waitForAll(executeableQuestionBlocks.map((block) => QuerySelectorFamily({ storyId, queryId: block.id })))
  )

  const previousComipledQueriesRef = usePreviousCompare(compiledQueries)

  const refreshOnInit = storyBlock?.format?.refreshOnOpen
  const permissions = useStoryPermissions(storyId)
  const refreshSnapshot = useRefreshSnapshot(storyId)

  useEffect(() => {
    if (refreshOnInit && permissions.canWrite) {
      executeableQuestionBlocks.forEach((questionBlock: Editor.DataAssetBlock) => {
        if (dayjs().diff(dayjs(questionBlock.content?.lastRunAt ?? 0)) > 1000 * 5 * 60) {
          refreshSnapshot.execute(questionBlock)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshOnInit, refreshSnapshot])

  useEffect(() => {
    for (const queryBlock of executeableQuestionBlocks) {
      const snapshotId = queryBlock?.content?.snapshotId
      const blockId = queryBlock.id
      const mutatingCount = queryClient.isMutating({
        predicate: (mutation) => (mutation.options.mutationKey as string)?.endsWith(blockId)
      })
      if (blockId && !snapshotId && mutatingCount === 0 && !queryBlock.content?.error) {
        if (
          (queryBlock.type === Editor.BlockType.SQL && (queryBlock as Editor.SQLBlock).content?.sql) ||
          queryBlock.type === Editor.BlockType.SmartQuery
        ) {
          refreshSnapshot.execute(queryBlock)
        }
      }
    }
  }, [queryClient, refreshSnapshot, executeableQuestionBlocks])

  useEffect(() => {
    if (!previousComipledQueriesRef) return
    for (let i = 0; i < compiledQueries.length; i++) {
      const currentQuery = compiledQueries[i]
      const queryBlock = executeableQuestionBlocks[i]
      if (currentActiveQueryBlockId.current === currentQuery.query.id) {
        continue
      }
      const previousQuery = previousComipledQueriesRef.find(
        (previousQuery) => previousQuery.query.id === currentQuery.query.id
      )
      if (!previousQuery || !currentQuery) continue
      if (dequal(previousQuery, currentQuery) !== true) {
        refreshSnapshot.execute(queryBlock)
      }
    }
  }, [previousComipledQueriesRef, compiledQueries, executeableQuestionBlocks, refreshSnapshot, activeId])

  const runAll = useCallback(() => {
    executeableQuestionBlocks.forEach((questionBlock: Editor.DataAssetBlock) => {
      refreshSnapshot.execute(questionBlock)
    })
  }, [executeableQuestionBlocks, refreshSnapshot])

  const cancelAll = useCallback(() => {
    executeableQuestionBlocks.forEach((questionBlock: Editor.DataAssetBlock) => {
      refreshSnapshot.cancel(questionBlock.id)
    })
  }, [executeableQuestionBlocks, refreshSnapshot])

  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string)?.startsWith(`story/${storyId}`)
  })

  return useMemo(
    () => ({
      total: executeableQuestionBlocks.length,
      mutating: refreshingSnapshot,
      runAll,
      cancelAll
    }),
    [cancelAll, executeableQuestionBlocks.length, refreshingSnapshot, runAll]
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

export const useSnapshotMutating = (blockId: string) => {
  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string)?.endsWith(blockId)
  })

  return refreshingSnapshot
}

export interface SnapshotMutation {
  execute: (questionBlock: Editor.DataAssetBlock) => Promise<void>
  cancel: (blockId: string) => void
}
