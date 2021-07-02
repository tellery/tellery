import { map } from 'lodash'
import { Readable } from 'stream'
import { getRepository } from 'typeorm'

import { IConnectorManager } from '../clients/connector/interface'
import { getIPermission, IPermission } from '../core/permission'
import { ConnectorEntity } from '../entities/connector'
import {
  AddConnectorDTO,
  AvailableConfig,
  Collection,
  ConnectorDTO,
  Database,
  Profile,
  TypeField,
} from '../types/connector'
import { canGetWorkspaceData, canUpdateWorkspaceData } from '../utils/permission'

export class ConnectorService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  async addConnector(
    getManager: (req: AddConnectorDTO) => IConnectorManager,
    operatorId: string,
    workspaceId: string,
    request: AddConnectorDTO,
  ): Promise<string> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    const manager = getManager(request)
    await manager.listProfiles()

    const entity = new ConnectorEntity()
    entity.url = request.url
    entity.workspaceId = workspaceId
    entity.authType = request.authType
    entity.authData = request.authData
    entity.name = request.name
    entity.alive = true
    const { id } = await entity.save()
    return id
  }

  /**
   * TODO: add loadmore
   */
  async listConnectors(operatorId: string, workspaceId: string): Promise<ConnectorDTO[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const connectors = await getRepository(ConnectorEntity).find({ workspaceId })
    return map(connectors, ({ id, name, url }) => ({
      id,
      name,
      url,
    }))
  }

  /**
   * list available configs of a connector deployment
   */
  async listAvailableConfigs(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<AvailableConfig[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listAvailableConfigs()
  }

  async listProfiles(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<Profile[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listProfiles()
  }

  async upsertProfile(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    newProfile: Profile,
  ): Promise<Profile[]> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.upsertProfile(newProfile)
  }

  async deleteProfile(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profileName: string,
  ): Promise<Profile[]> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.deleteProfile(profileName)
  }

  async listDatabases(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profileName: string,
  ): Promise<Database[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listDatabases(profileName)
  }

  async listCollections(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profileName: string,
    database: string,
  ): Promise<Collection[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listCollections(profileName, database)
  }

  /**
   * get the structure (schema) of a certain collection
   */
  async getCollectionSchema(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<TypeField[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.getCollectionSchema(profile, database, collection, schema)
  }

  async executeSql(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profileName: string,
    sqlStr: string,
    identifier: string,
    maxRow?: number,
    flag?: string,
    errorHandler?: (err: Error) => void,
  ): Promise<Readable> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.executeSql(profileName, sqlStr, identifier, maxRow, flag, errorHandler)
  }

  async cancelQuery(connectorManager: IConnectorManager, identifier: string): Promise<void> {
    return connectorManager.cancelQuery(identifier)
  }

  /**
   * import file into data warehouse by a connector
   */
  async importFromFile(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
    url: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<{ database: string; collection: string }> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.importFromFile(profile, url, database, collection, schema)
  }
}

const service = new ConnectorService(getIPermission())
export default service
