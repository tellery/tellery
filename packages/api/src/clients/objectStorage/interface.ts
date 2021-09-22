import { FileBody } from '../../types/file'
import { ProvisionRequest, ProvisionBody } from '../../types/upload'

interface IObjectStorage {
  provision(provisionRequest: ProvisionRequest): ProvisionBody
  proxy(fileKey: string): Promise<{
    maxAge: number
    body: string | FileBody | null
  }>
  storageType: 'REDIRECT' | 'DIRECT'
}

export { IObjectStorage }
