import config from 'config'
import * as crypto from 'crypto'
import * as qs from 'querystring'
import { nanoid } from 'nanoid'
import { ProvisionBody, ProvisionRequest } from '../../types/upload'

const storageType = 'REDIRECT'

type OSSConfig = {
  type: 'oss'
  bucket: string
  accessKey: string
  secretKey: string
  region: string
  cdn?: string
}

const ossConfig = config.get<OSSConfig>('objectStorage')

function provision(_: ProvisionRequest): ProvisionBody {
  const expiresIn = 15 * 60
  const key = nanoid()

  const policy = Buffer.from(
    JSON.stringify({
      expiration: new Date(Date.now() + expiresIn * 1000).toISOString(),
      conditions: [{ bucket: ossConfig.bucket }],
    }),
  ).toString('base64')

  const signature = crypto.createHmac('sha1', ossConfig.secretKey).update(policy).digest('base64')

  const form = {
    'Cache-Control': 'public, max-age=31104000',
    Signature: signature,
    OSSAccessKeyId: ossConfig.accessKey,
    policy,
    key,
    expire: expiresIn.toString(),
    success_action_status: '200',
  }
  return {
    url: `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com`,
    key,
    form,
    expiresIn,
  }
}

function getTemporaryUrl(fileKey: string, opts: { ttl?: number } = {}): string {
  const { bucket } = ossConfig
  const { ttl = 60 * 60 * 24 * 30 * 12 } = opts
  const expires = Math.floor(Date.now() / 1000) + ttl
  const info = ['GET', '', '', expires, `/${bucket}/${fileKey}`].join('\n')
  const signature = crypto
    .createHmac('sha1', ossConfig.secretKey)
    .update(Buffer.from(info, 'utf-8'))
    .digest('base64')

  const params = {
    Expires: expires,
    OSSAccessKeyId: ossConfig.accessKey,
    Signature: signature,
  }

  return `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${fileKey}?${qs.stringify(
    params,
  )}`
}

async function proxy(fileKey: string): Promise<{
  maxAge: number
  body: string
}> {
  if (ossConfig.cdn) {
    return {
      maxAge: 60 * 60 * 24 * 30 * 12,
      body: `${ossConfig.cdn}/${fileKey}`,
    }
  } else {
    return {
      maxAge: 60 * 60 * 24 * 7,
      body: getTemporaryUrl(fileKey),
    }
  }
}

export { provision, getTemporaryUrl, proxy, storageType }
