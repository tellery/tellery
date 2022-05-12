import { TippySingletonContext } from '@app/hooks/useTippySingleton'
import { DEFAULT_TIPPY_DELAY } from '@app/utils'
import Tippy, { TippyProps, useSingleton } from '@tippyjs/react'
import React from 'react'

export const TippySingletonContextProvider: ReactFCWithChildren<Omit<TippyProps, 'children'>> = ({
  children,
  delay = DEFAULT_TIPPY_DELAY,
  ...rest
}) => {
  const [source, target] = useSingleton()
  return (
    <TippySingletonContext.Provider value={target}>
      <Tippy singleton={source} delay={delay} {...rest} />
      {children}
    </TippySingletonContext.Provider>
  )
}
