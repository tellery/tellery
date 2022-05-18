import { getRepository } from 'typeorm'
import { ConnectorEntity } from '../../entities/connector'
import { NotFoundError } from '../../error/error'
import { AuthData, AuthType } from '../../types/auth'
import { getGrpcConnector } from './grpcManager'
import { IConnectorManager } from './interface'

// get connector manager

// NOTE: If you want to get a connector manager anywhere else, you should go with this function
export function getIConnectorManager(
  workspaceId: string,
  url: string,
  authType: AuthType,
  authData: AuthData,
): IConnectorManager {
  return getGrpcConnector(workspaceId, url, authType, authData)
}

export async function getIConnectorManagerFromDB(
  workspaceId: string,
  connectorId: string,
): Promise<IConnectorManager> {
  const connector = await getRepository(ConnectorEntity).findOne({
    id: connectorId,
    workspaceId,
  })
  if (connector) {
    return getIConnectorManager(
      connector.workspaceId,
      connector.url,
      connector.authType,
      connector.authData,
    )
  }
  throw NotFoundError.resourceNotFound(connectorId)
}
