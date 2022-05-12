import { useWorkspace } from '@app/hooks/useWorkspace'
import React from 'react'

export const WorkspaceProvider: ReactFCWithChildren = ({ children }) => {
  useWorkspace()

  return <>{children}</>
}
