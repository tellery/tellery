import { authContext, useProvideAuth } from '@app/hooks/useAuth'
import React from 'react'

export const AuthProvider: React.FC = ({ children }) => {
  const auth = useProvideAuth()
  return <authContext.Provider value={auth}>{children}</authContext.Provider>
}
