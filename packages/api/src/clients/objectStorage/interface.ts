import { ProvisionBody } from '../../types/upload'

interface IObjectStorage {
  provision(): ProvisionBody
  proxy(fileKey: string): Promise<string | Buffer | null>
}

export { IObjectStorage }
