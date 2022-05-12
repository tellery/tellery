import { CommitContext, useCommitProvider } from '@app/hooks/useCommit'
import React from 'react'

export const CommitContextProvider: ReactFCWithChildren = ({ children }) => {
  const commitContextValue = useCommitProvider()

  return <CommitContext.Provider value={commitContextValue}>{children}</CommitContext.Provider>
}
