import { sqlRequest } from '@app/api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { RECORD_LIMIT } from '@app/utils'
import { useCallback } from 'react'

export const useExecuteSql = () => {
  const workspace = useWorkspace()

  return useCallback(
    (sql: string, maxRow: number = RECORD_LIMIT) => {
      return sqlRequest({
        workspaceId: workspace.id,
        sql,
        connectorId: workspace.preferences.connectorId!,
        profile: workspace.preferences.profile!,
        maxRow: maxRow
      })
    },
    [workspace.id, workspace.preferences.connectorId, workspace.preferences.profile]
  )
}
