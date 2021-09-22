import config from 'config'

import { getIPermission, IPermission } from '../core/permission'
import { getObjectStorageByName } from '../clients/objectStorage'
import { IObjectStorage } from '../clients/objectStorage/interface'
import { ProvisionBody, ProvisionRequest } from '../types/upload'
import { canGetWorkspaceData } from '../utils/permission'
import { FileBody } from '../types/file'

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
  async provision(
    operatorId: string,
    workspaceId: string,
    provisionRequest: ProvisionRequest,
  ): Promise<ProvisionBody> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)
    return this.objectStorage.provision(provisionRequest)
  }

  /**
   * proxy of fetching object
   */
  async objectProxy(
    operatorId: string,
    workspaceId: string,
    fileKey: string,
    opts: { skipPermissionCheck?: boolean; acquireUrlOnly?: boolean } = {},
  ): Promise<{
    maxAge: number
    body: string | FileBody | null
  }> {
    const { skipPermissionCheck = false, acquireUrlOnly = false } = opts
    if (!skipPermissionCheck) {
      await canGetWorkspaceData(this.permission, operatorId, workspaceId)
    }
    if (acquireUrlOnly && this.objectStorage.storageType !== 'REDIRECT') {
      return {
        maxAge: 0,
        body: null,
      }
    }
    return this.objectStorage.proxy(fileKey)
  }
}

const service = new StorageService(
  getIPermission(),
  getObjectStorageByName(config.get('objectStorage.type')),
)
export default service
