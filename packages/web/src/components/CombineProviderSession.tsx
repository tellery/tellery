// import { DebugObserver } from '@app/store'
import { CommitContextProvider } from '@app/components/CommitContextProvider'
import { SocketContextProvider } from '@app/components/SocketContextProvider'
import React from 'react'
import { BlockDndContextProvider } from './BlockDndContextProvider'
import { BlockTranscationProvider } from './BlockTranscationProvider'
import { WorkspaceProvider } from './WorkspaceProvider'

export const CombineProviderSession: React.FC = ({ children }) => {
  return (
    <WorkspaceProvider>
      <CommitContextProvider>
        <BlockTranscationProvider>
          <BlockDndContextProvider>
            <SocketContextProvider>{children}</SocketContextProvider>
          </BlockDndContextProvider>
        </BlockTranscationProvider>
      </CommitContextProvider>
    </WorkspaceProvider>
  )
}
