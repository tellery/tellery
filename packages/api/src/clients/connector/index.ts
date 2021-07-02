import { getRepository } from 'typeorm'
import { ConnectorEntity } from '../../entities/connector'
import { NotFoundError } from '../../error/error'
import { AuthData, AuthType } from '../../types/auth'
import { getGrpcConnector } from './grpcManager'
import { IConnectorManager } from './interface'

// get connector manager

// NOTE: If you want to get a connector manager anywhere else, you should go with this function
export function getIConnectorManager(
  url: string,
  authType: AuthType,
  authData: AuthData,
): IConnectorManager {
  return getGrpcConnector(url, authType, authData)
}

export async function getIConnectorManagerFromDB(connectorId: string): Promise<IConnectorManager> {
  const connector = await getRepository(ConnectorEntity).findOne(connectorId)
  if (connector) {
    return getIConnectorManager(connector.url, connector.authType, connector.authData)
  }
  throw NotFoundError.resourceNotFound(connectorId)
}
