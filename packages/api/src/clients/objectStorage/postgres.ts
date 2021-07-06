import config from 'config'
import { nanoid } from 'nanoid'
import { ProvisionBody } from '../../types/upload'
import selfhostedStorage from '../../store/selfhostedStorage'

const serverCfg = config.get('server') as {
  protocol: 'http' | 'https'
  host: string
  port: number
}

function provision(): ProvisionBody {
  const key = nanoid()

  return {
    url: `${serverCfg.protocol}://${serverCfg.host}:${serverCfg.port}/api/storage/upload`,
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
