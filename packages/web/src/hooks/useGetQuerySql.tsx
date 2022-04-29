import { translateSmartQuery } from '@app/api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'
import { useCallback } from 'react'
import { useGetCompiledQuery } from './useCompiledQuery'

export const useGetQuerySql = () => {
  const getCompiledQuery = useGetCompiledQuery()
  const workspace = useWorkspace()
  return useCallback(
    async (storyId: string, queryBlock: Editor.QueryBlock) => {
      const { query, isTemp } = await getCompiledQuery(storyId, queryBlock.id)
      let sql = ''
      if (query.type === 'sql') {
        sql = query.data
      } else if (query.type === 'smart') {
        const { queryBuilderId, metricIds, dimensions, filters } = JSON.parse(query.data)
        sql = (
          await translateSmartQuery(
            workspace.id,
            workspace.preferences?.connectorId!,
            queryBuilderId,
            metricIds,
            dimensions,
            filters
          )
        ).data.sql
      }
      return { sql: sql, isTemp: isTemp }
    },
    [getCompiledQuery, workspace.id, workspace.preferences?.connectorId]
  )
}
