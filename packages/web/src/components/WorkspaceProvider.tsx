import { useWorkspace } from '@app/hooks/useWorkspace'
import React from 'react'

export const WorkspaceProvider: React.FC = ({ children }) => {
  useWorkspace()

  return <>{children}</>
}
