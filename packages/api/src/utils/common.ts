import _ from 'lodash'
import config from 'config'
import { networkInterfaces } from 'os'
import { SearchFilter } from '../core/search/interface'

export function mergeSearchFilters(filters: SearchFilter[]): SearchFilter {
  let parameters = {}
  _(filters).forEach((f) => {
    parameters = { ...parameters, ...f.parameters }
  })

  return {
    query: (t) =>
      _(filters)
        .map((f) => f.query(t))
        .compact()
        .join(' AND '),
    parameters,
  }
}

export function getSecretKey(): string {
  const key = config.get('secretKey') as string
  if (!key) {
    throw new Error('missing secretKey')
  }
  return key
}

function ip() {
  return _(networkInterfaces())
    .values()
    .compact()
    .flatMap()
    .find((i) => i.family === 'IPv4' && !i.internal)?.address
}

function host() {
  const protocol = config.get('server.protocol') as string
  const h = (config.get('server.host') ?? ip()) as string
  const webPort = config.get('server.webPort') as number
  return webPort === 80 ? `${protocol}://${h}` : `${protocol}://${h}:${webPort}`
}

// generate url for external usage
export function absoluteURI(path: string): string {
  const prefix = host()
  return `${prefix}${path}`
}

export function string2Hex(s: string): string {
  return Buffer.from(s, 'utf8').toString('hex')
}

export function hex2String(h: string): string {
  return Buffer.from(h, 'hex').toString('utf8')
}
