import { CommitContextProvider } from '@app/components/CommitContextProvider'
import { SocketContextProvider } from '@app/components/SocketContextProvider'
import { useWorkspace } from '@app/hooks/useWorkspace'
import React from 'react'
import { BlockDndContextProvider } from './BlockDndContextProvider'
import { BlockTranscationProvider } from './BlockTranscationProvider'
import { CurrentConnectorProvider } from './CurrentConnectorProvider'

export const CombineProviderSession: ReactFCWithChildren = ({ children }) => {
  const workspace = useWorkspace()
  return (
    <CommitContextProvider>
      <BlockTranscationProvider>
        <BlockDndContextProvider>
          <CurrentConnectorProvider connectorId={workspace.preferences.connectorId}>
            <SocketContextProvider>{children}</SocketContextProvider>
          </CurrentConnectorProvider>
        </BlockDndContextProvider>
      </BlockTranscationProvider>
    </CommitContextProvider>
  )
}
