import { sqlRequest } from '@app/api'
import { useWorkspace } from '@app/context/workspace'
import { createTranscation } from 'context/editorTranscations'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useIsMutating, useMutation, useQueryClient } from 'react-query'
import { applyCreateSnapshotOperation } from 'store/block'
import type { Editor } from 'types'
import { useCommit } from './useCommit'

class SnapshotManager {
  instances: Map<string, Map<string, SnapshotMutation>>
  observers: Map<string, Function>
  constructor() {
    this.instances = new Map()
    this.observers = new Map()
  }

  addInstance(storyId: string, originalBlockId: string, mutation: SnapshotMutation) {
    if (this.instances.has(storyId) === false) {
      this.instances.set(storyId, new Map())
    }
    const storyInstances = this.instances.get(storyId)!
    storyInstances.set(originalBlockId, mutation)
    this.observers.get(storyId)?.(storyInstances.size)
  }

  removeInstance(storyId: string, originalBlockId: string) {
    const storyInstances = this.instances.get(storyId)
    if (storyInstances) {
      storyInstances.delete(originalBlockId)
      this.observers.get(storyId)?.(storyInstances.size)
      if (storyInstances.size === 0) {
        this.instances.delete(storyId)
      }
    }
  }

  refreshSnapshotInStory(storyId: string) {
    const storyInstances = this.instances.get(storyId)
    console.log(this.instances, storyInstances, storyId)
    if (storyInstances) {
      for (const insatance of storyInstances) {
        insatance[1].execute()
      }
    }
  }

  observerSizeChange(storyId: string, callback: Function) {
    this.observers.set(storyId, callback)

    return () => {
      this.observers.delete(storyId)
    }
  }
}
export const snapshotManager = new SnapshotManager()

export const useStorySnapshotManager = (storyId: string) => {
  const [storySnapshotCount, setStorySnapshotCount] = useState(0)

  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string)?.startsWith(`story/${storyId}`)
  })

  useEffect(() => {
    const unobserve = snapshotManager.observerSizeChange(storyId, (size: number) => {
      setStorySnapshotCount(size)
    })
    return () => {
      unobserve()
    }
  }, [storyId])

  return useMemo(
    () => ({
      total: storySnapshotCount,
      mutating: refreshingSnapshot,
      runAll: () => snapshotManager.refreshSnapshotInStory(storyId)
    }),
    [refreshingSnapshot, storyId, storySnapshotCount]
  )
}

export const useSnapshotMutating = (originalBlockId: string) => {
  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string)?.endsWith(originalBlockId)
  })

  return refreshingSnapshot
}

export interface SnapshotMutation {
  execute: () => void
  cancel: () => void
}
export const useRefreshSnapshot = (originalBlock: Editor.QuestionBlock, blockId: string, storyId: string) => {
  const originalBlockId = originalBlock.id
  const sql = originalBlock.content?.sql ?? ''
  const commit = useCommit()

  const mutation = useMutation(sqlRequest, {
    mutationKey: ['story', storyId, blockId, originalBlockId].join('/'),
    onSuccess: async (data) => {
      if (typeof data !== 'object' || data.errMsg) {
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
        storyId,
        transcation: createTranscation({
          operations: [
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
  const workspace = useWorkspace()
  const execute = useCallback(async () => {
    if (sql) {
      if (!originalBlock) return
      await mutation.mutateAsync({
        workspaceId: workspace.id,
        sql,
        questionId: originalBlockId,
        connectorId: workspace.preferences.connectorId!,
        profile: workspace.preferences.profile!
      })
    }
  }, [
    sql,
    originalBlock,
    mutation,
    workspace.id,
    workspace.preferences.connectorId,
    workspace.preferences.profile,
    originalBlockId
  ])

  const queryClient = useQueryClient()

  const cancel = useCallback(() => {
    const mutations = queryClient.getMutationCache().getAll()
    mutations
      .filter((mutation) => (mutation.options.mutationKey as string)?.endsWith(originalBlockId))
      .forEach((mutation) => {
        queryClient.getMutationCache().remove(mutation)
      })
    // executeSQL.reset()
  }, [originalBlockId, queryClient])

  const snapshotMutation = useMemo<SnapshotMutation>(
    () => ({
      execute,
      cancel
    }),
    [cancel, execute]
  )

  useEffect(() => {
    console.log('add instance')
    snapshotManager.addInstance(storyId, originalBlockId, snapshotMutation)
    return () => {
      console.log('remove instance')
      snapshotManager.removeInstance(storyId, originalBlockId)
    }
  }, [originalBlockId, snapshotMutation, storyId])

  return snapshotMutation
}
