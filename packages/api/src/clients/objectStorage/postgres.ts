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

async function proxy(fileKey: string): Promise<{
  maxAge: number
  body: FileBody | null
}> {
  return {
    maxAge: 60 * 60 * 24 * 30 * 12,
    body: await selfhostedStorage.fetchFile(fileKey),
  }
}

export { provision, proxy, storageType }
