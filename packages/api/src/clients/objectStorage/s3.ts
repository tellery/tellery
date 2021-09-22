import config from 'config'
import { nanoid } from 'nanoid'
import S3 from 'aws-sdk/clients/s3'
import { Credentials } from 'aws-sdk'

import { ProvisionBody, ProvisionRequest } from '../../types/upload'

const storageType = 'REDIRECT'

type S3Config = {
  type: 's3'
  bucket: string
  accessKey: string
  secretKey: string
  region: string
  endpoint: string
  cdn?: string
}

const s3Config = config.get<S3Config>('objectStorage')

const s3Client = new S3({
  credentials: new Credentials(s3Config.accessKey, s3Config.secretKey),
  endpoint: s3Config.endpoint,
  region: s3Config.region,
})

function provision(_: ProvisionRequest): ProvisionBody {
  const expiresIn = 15 * 60
  const key = nanoid()

  const { url, fields: form } = s3Client.createPresignedPost({
    Bucket: s3Config.bucket,
    Fields: {
      'Cache-Control': 'public, max-age=31104000',
      success_action_status: '200',
      key,
    },
    Expires: expiresIn,
  })

  return {
    url,
    key,
    form,
    expiresIn,
  }
}

function getTemporaryUrl(fileKey: string, opts: { ttl?: number } = {}): string {
  const { bucket } = s3Config
  const { ttl = 60 * 60 * 24 * 30 * 12 } = opts
  const expires = Math.floor(Date.now() / 1000) + ttl

  const url = s3Client.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: fileKey,
    Expires: expires,
  })

  return url
}

async function proxy(fileKey: string): Promise<{
  maxAge: number
  body: string
}> {
  if (s3Config.cdn) {
    return {
      maxAge: 60 * 60 * 24 * 30 * 12,
      body: `${s3Config.cdn}/${fileKey}`,
    }
  }
  return {
    maxAge: 60 * 60 * 24 * 7,
    body: getTemporaryUrl(fileKey),
  }
}

export { provision, getTemporaryUrl, proxy, storageType }
