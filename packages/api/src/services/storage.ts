import config from 'config'
import * as _ from 'lodash'

import { getIPermission, IPermission } from '../core/permission'
import { getObjectStorageByName } from '../clients/objectStorage'
import { IObjectStorage } from '../clients/objectStorage/interface'
import { ProvisionBody } from '../types/upload'
import { canGetWorkspaceData } from '../utils/permission'

export class StorageService {
  private permission: IPermission

  private objectStorage: IObjectStorage

  constructor(permission: IPermission, objectStorage: IObjectStorage) {
    this.permission = permission
    this.objectStorage = objectStorage
  }

  /**
   * making provision of uploading
   */
  async provision(operatorId: string, workspaceId: string): Promise<ProvisionBody> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)
    return this.objectStorage.provision()
  }

  /**
   * proxy of fetching object
   */
  async objectProxy(
    operatorId: string,
    workspaceId: string,
    fileKey: string,
  ): Promise<string | Buffer | null> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)
    return this.objectStorage.proxy(fileKey)
  }
}

const service = new StorageService(
  getIPermission(),
  getObjectStorageByName(config.get('objectStorage.type')),
)
export default service
