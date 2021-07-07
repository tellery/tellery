import { IObjectStorage } from './interface'
import * as oss from './oss'
import * as s3 from './s3'
import * as postgres from './postgres'

const storageVendor: Record<string, IObjectStorage> = {
  oss,
  s3,
  postgres,
}

function getObjectStorageByName(name: string): IObjectStorage {
  return storageVendor[name]
}

export { getObjectStorageByName }
