import React, { useEffect } from 'react'
import { useWorkspaceList } from 'hooks/api'
import { WorkspaceContext } from '@app/context/workspace'
import { useWorkspaceIdState } from '@app/store/block'

export const WorkspaceProvider: React.FC = ({ children }) => {
  const { data: workspaces } = useWorkspaceList({ suspense: true })
  const currentWorkspace = workspaces?.[0]
  const [, setWorkspaceId] = useWorkspaceIdState()

  useEffect(() => {
    setWorkspaceId(currentWorkspace?.id ?? null)
  }, [currentWorkspace, setWorkspaceId])

  return <WorkspaceContext.Provider value={currentWorkspace}>{children}</WorkspaceContext.Provider>
}
