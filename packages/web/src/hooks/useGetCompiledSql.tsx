import { getCompiledSql } from '@app/api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'
import { RECORD_LIMIT } from '@app/utils'
import { useCallback } from 'react'
import { useGetQuerySql } from './useGetQuerySql'

export const useGetCompiledSql = () => {
  const getQuerySql = useGetQuerySql()
  const workspace = useWorkspace()
  return useCallback(
    async (storyId: string, queryBlock: Editor.QueryBlock) => {
      const { sql } = await getQuerySql(storyId, queryBlock)
      return getCompiledSql({
        workspaceId: workspace.id,
        connectorId: workspace.preferences?.connectorId!,
        profile: workspace.preferences?.profile!,
        sql,
        maxRow: RECORD_LIMIT
      })
    },
    [getQuerySql, workspace.id, workspace.preferences?.connectorId, workspace.preferences?.profile]
  )
}
