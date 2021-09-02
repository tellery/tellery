import { useSingleton } from '@tippyjs/react'
import React, { useContext } from 'react'

export const TippySingletonContext = React.createContext<ReturnType<typeof useSingleton>[0] | undefined>(undefined)

export const useTippySingleton = () => {
  const context = useContext(TippySingletonContext)
  return context
}
