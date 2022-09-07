import type { Connector } from '@app/types'
import React, { useContext } from 'react'

export const useCurrentConnector = () => {
  const connector = useContext(CurrentConnectorContext)

  return connector
}

export const CurrentConnectorContext = React.createContext<Connector | null>(null)
