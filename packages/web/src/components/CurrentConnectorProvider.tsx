import { useConnectorsList } from '@app/hooks/api'
import { CurrentConnectorContext, useCurrentConnector } from '@app/hooks/useCurrentConnector'
import React from 'react'

export const CurrentConnectorProvider: ReactFCWithChildren<{ connectorId?: string }> = ({ children, connectorId }) => {
  const { data: connectors } = useConnectorsList()
  const parentConnector = useCurrentConnector()

  const currentConnector = React.useMemo(() => {
    if (connectors && connectorId) {
      return connectors.find((connector) => connector.id === connectorId) ?? null
    } else if (parentConnector) {
      return parentConnector
    } else {
      return null
    }
  }, [connectors, parentConnector, connectorId])

  return <CurrentConnectorContext.Provider value={currentConnector}>{children}</CurrentConnectorContext.Provider>
}
