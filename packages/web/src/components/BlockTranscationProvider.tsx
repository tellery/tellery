import React from 'react'
import { BlockTranscationsContext, useBlockTranscationProvider } from '../hooks/useBlockTranscation'

export const BlockTranscationProvider: ReactFCWithChildren = ({ children }) => {
  const blockTransctionValue = useBlockTranscationProvider()
  return <BlockTranscationsContext.Provider value={blockTransctionValue}>{children}</BlockTranscationsContext.Provider>
}
