import mount from 'koa-mount'
import serve from 'koa-static'
import path from 'path'
import config from 'config'
import proxy from 'koa-better-http-proxy'
import compose from 'koa-compose'
import { historyApiFallback } from 'koa2-connect-history-api-fallback'
import { loadFrontendEnvConfig } from '../utils/frontendInjector'
import koa from 'koa'

const frontendAssestDir = config.get<string>('frontendConfig.assestsUrl')
const frontendHost = config.get<string>('frontendConfig.host')
const isWebUrl = frontendAssestDir.startsWith('http')
const isHttps = frontendAssestDir.startsWith('https')
const staticDirPath = path.join(__dirname, frontendAssestDir)
const webUrl = isWebUrl ? new URL('http://localhost:3000') : null
const frontendEnv = loadFrontendEnvConfig()
const envString = JSON.stringify(frontendEnv)

const injectEnvMiddleware: koa.Middleware = async (ctx, next) => {
  const contentType = ctx.response.headers['content-type']
  if (contentType && typeof contentType === 'string' && contentType.startsWith('text/html')) {
    const body = (ctx.body as Buffer).toString()
    ctx.body = Buffer.from(
      body.replace(
        /(<script .*?\s* id="telleryBootstrap">\s*)(\{.*?\})(\s*<\/script>)/s,
        (match, p1, p2, p3) => {
          return `${p1}${envString}${p3}`
        },
      ),
      'utf-8',
    )
  }
  await next()
}

const staticMiddleware = isWebUrl
  ? proxy(webUrl?.host ?? '', {
      proxyReqOptDecorator(request) {
        request.headers.host = frontendHost
        return request
      },
      proxyReqPathResolver: (ctx) => {
        return `${webUrl?.pathname === '/' ? '' : webUrl?.pathname}${ctx.path}`
      },
      https: isHttps,
      preserveHostHdr: false,
    })
  : mount('/', serve(path.join(staticDirPath, 'web')))

export default compose([
  mount('/api/static', serve(path.join(staticDirPath, 'images'))),
  historyApiFallback({ index: '/index.html', whiteList: ['/api'] }),
  staticMiddleware,
  injectEnvMiddleware,
])
