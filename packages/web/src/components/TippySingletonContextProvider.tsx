import { TippySingletonContext } from '@app/hooks/useTippySingleton'
import Tippy, { TippyProps, useSingleton } from '@tippyjs/react'
import React from 'react'

export const TippySingletonContextProvider: React.FC<Omit<TippyProps, 'children'>> = ({ children, ...rest }) => {
  const [source, target] = useSingleton()
  return (
    <TippySingletonContext.Provider value={target}>
      <Tippy singleton={source} {...rest} />
      {children}
    </TippySingletonContext.Provider>
  )
}
