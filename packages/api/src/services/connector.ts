import { map } from 'lodash'
import { Readable } from 'stream'
import { getRepository } from 'typeorm'

import { IConnectorManager } from '../clients/connector/interface'
import { getIPermission, IPermission } from '../core/permission'
import { ConnectorEntity } from '../entities/connector'
import { NotFoundError } from '../error/error'
import {
  AddConnectorDTO,
  AvailableConfig,
  Collection,
  ConnectorDTO,
  Database,
  Integration,
  Profile,
  ProfileSpec,
  TypeField,
} from '../types/connector'
import { canGetWorkspaceData, canUpdateWorkspaceData } from '../utils/permission'
import storageService from './storage'

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
    await manager.getProfile()

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
   * list available profile configs of a connector deployment
   */
  async getProfileConfigs(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<AvailableConfig[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.getProfileConfigs()
  }

  /**
   * TODO: see if caching is needed
   * TODO: implement setCurrentConnector in the backend, and invalidate the cache here when connector changed
   */
  async getProfileSpec(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<ProfileSpec> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)
    return connectorManager.getProfileSpec()
  }

  async getProfile(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<Profile | undefined> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.getProfile()
  }

  async upsertProfile(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    newProfile: Profile,
  ): Promise<Profile> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.upsertProfile(newProfile)
  }

  async getIntegrationConfigs(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<AvailableConfig[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.getIntegrationConfigs()
  }

  async listIntegrations(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<Integration[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listIntegrations()
  }

  async upsertIntegration(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    newIntegration: Integration,
  ): Promise<Integration> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.upsertIntegration(newIntegration)
  }

  async deleteIntegration(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    integrationId: number,
  ): Promise<void> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.deleteIntegration(integrationId)
  }

  async listDatabases(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ): Promise<Database[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listDatabases()
  }

  async listCollections(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    database: string,
  ): Promise<Collection[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.listCollections(database)
  }

  /**
   * get the structure (schema) of a certain collection
   */
  async getCollectionSchema(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<TypeField[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.getCollectionSchema(database, collection, schema)
  }

  async executeSql(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    sqlStr: string,
    identifier: string,
    maxRow?: number,
    flag?: string,
    errorHandler?: (err: Error) => void,
  ): Promise<Readable> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return connectorManager.executeSql(sqlStr, identifier, maxRow, flag, errorHandler)
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
    fileKey: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<{ database: string; collection: string }> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const { body } = await storageService.objectProxy(operatorId, workspaceId, fileKey, {
      skipPermissionCheck: true,
    })

    if (!body) {
      throw NotFoundError.resourceNotFound(`file ${fileKey}`)
    }

    if (body instanceof Object) {
      const { contentType, content } = body
      return connectorManager.importFromFile(content, contentType, database, collection, schema)
    }

    return connectorManager.importFromUrl(body, database, collection, schema)
  }
}

const service = new ConnectorService(getIPermission())
export default service
