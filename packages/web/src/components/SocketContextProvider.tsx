import type { ReactNode } from 'react'
import { SocketContext, useSocketContextProvider } from '../hooks/useSocketContextProvider'

export const SocketContextProvider = (props: { children: ReactNode }) => {
  const socketInstance = useSocketContextProvider()

  return <SocketContext.Provider value={socketInstance}>{props.children}</SocketContext.Provider>
}
