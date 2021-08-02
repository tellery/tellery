import React, { useEffect } from 'react'
import { useWorkspaceList } from '@app/hooks/api'
import { WorkspaceContext } from '@app/hooks/useWorkspace'
import { useWorkspaceIdState } from '@app/hooks/useWorkspaceIdAtom'

export const WorkspaceProvider: React.FC = ({ children }) => {
  const { data: workspaces } = useWorkspaceList({ suspense: true })
  const currentWorkspace = workspaces?.[0]
  const [, setWorkspaceId] = useWorkspaceIdState()

  useEffect(() => {
    setWorkspaceId(currentWorkspace?.id ?? null)
  }, [currentWorkspace, setWorkspaceId])

  return <WorkspaceContext.Provider value={currentWorkspace}>{children}</WorkspaceContext.Provider>
}
