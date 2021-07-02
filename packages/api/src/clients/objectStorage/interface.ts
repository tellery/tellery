import { ProvisionBody } from '../../types/upload'

interface IObjectStorage {
  provision(): ProvisionBody
  getTemporaryUrl(fileKey: string, opts: { ttl?: number }): string
}

export { IObjectStorage }
