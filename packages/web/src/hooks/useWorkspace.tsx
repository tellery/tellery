import type { Workspace } from '@app/types'
import { useContext, createContext } from 'react'

export const WorkspaceContext = createContext<Workspace | undefined>(undefined)

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) {
    throw new Error('no workspace')
  }
  return workspace
}
