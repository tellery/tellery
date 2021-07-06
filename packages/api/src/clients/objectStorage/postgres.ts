import { nanoid } from 'nanoid'
import { ProvisionBody, ProvisionRequest } from '../../types/upload'
import selfhostedStorage from '../../store/selfhostedStorage'
import { FileBody } from '../../types/file'

const storageType = 'DIRECT'

function provision(provisionRequest: ProvisionRequest): ProvisionBody {
  const key = nanoid()
  const { workspaceId, contentType } = provisionRequest

  return {
    url: '/api/storage/upload',
    key,
    expiresIn: 0,
    form: {
      key,
      workspaceId,
      contentType,
    },
  }
}

function proxy(fileKey: string): Promise<FileBody | null> {
  return selfhostedStorage.fetchFile(fileKey)
}

export { provision, proxy, storageType }
