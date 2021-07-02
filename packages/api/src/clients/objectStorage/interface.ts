import { FileInfo } from '../../types/file'
import { ProvisionBody } from '../../types/upload'

interface IObjectStorage {
  provision(): ProvisionBody
  sanitize?(file: FileInfo): FileInfo
  getTemporaryUrl(file: FileInfo, opts: { ttl?: number }): string
}

export { IObjectStorage }
