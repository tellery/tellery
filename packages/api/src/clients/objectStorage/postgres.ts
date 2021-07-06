import { nanoid } from 'nanoid'
import { ProvisionBody } from '../../types/upload'
import { absoluteURI } from '../../utils/common'
import selfhostedStorage from '../../store/selfhostedStorage'

function provision(): ProvisionBody {
  const key = nanoid()

  return {
    url: absoluteURI('/api/storage/upload'),
    key,
    expiresIn: 0,
    form: {
      key,
    },
  }
}

function proxy(fileKey: string): Promise<Buffer | null> {
  return selfhostedStorage.fetchFile(fileKey)
}

export { provision, proxy }
