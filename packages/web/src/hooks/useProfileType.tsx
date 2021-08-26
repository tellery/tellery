import { useConnectorsListProfiles } from '@app/hooks/api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useMemo } from 'react'

export const useProfileType = () => {
  const workspace = useWorkspace()
  const { data: profiles } = useConnectorsListProfiles(workspace.preferences.connectorId)
  const profileType = useMemo(
    () => profiles?.find((profile) => profile.name === workspace.preferences.profile)?.type,
    [profiles, workspace.preferences.profile]
  )
  return profileType
}
