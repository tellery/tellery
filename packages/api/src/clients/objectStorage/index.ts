import { IObjectStorage } from './interface'
import * as oss from './oss'
import * as s3 from './s3'

const storageVendor: Record<string, IObjectStorage> = {
  oss,
  s3,
}

function getObjectStorageByName(name: string): IObjectStorage {
  return storageVendor[name]
}

export { getObjectStorageByName }
