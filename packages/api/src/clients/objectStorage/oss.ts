import config from 'config'
import _ from 'lodash'
import * as crypto from 'crypto'
import * as qs from 'querystring'
import { nanoid } from 'nanoid'
import { ProvisionBody } from '../../types/upload'

type OSSConfig = {
  type: 'oss'
  bucket: string
  accessKey: string
  secretKey: string
  region: string
}

const ossConfig = config.get<OSSConfig>('objectStorage')

function provision(): ProvisionBody {
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
    OSSAccessKeyId: ossConfig.accessKey,
    policy,
    signature,
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
  const { ttl = 60 * 10 } = opts
  const expires = Math.floor(Date.now() / 1000) + ttl
  const info = ['GET', '', '', expires, `${bucket}/${fileKey}`].join('\n')
  const signature = crypto
    .createHmac('sha1', ossConfig.secretKey)
    .update(Buffer.from(info, 'utf-8'))
    .digest('base64')

  const params = {
    Expires: expires,
    OSSAccessKeyId: ossConfig.accessKey,
    Signature: signature,
  }

  return `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/$key?${qs.stringify(params)}`
}

export { provision, getTemporaryUrl }
