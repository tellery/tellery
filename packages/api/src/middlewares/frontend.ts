import mount from 'koa-mount'
import serve from 'koa-static'
import path from 'path'
import config from 'config'
import proxy from 'koa-better-http-proxy'
import compose from 'koa-compose'
import { historyApiFallback } from 'koa2-connect-history-api-fallback'
import { loadFrontendEnvConfig } from '../utils/frontendInjector'

const frontendAssestUrl = config.get<string>('frontendConfig.assestsUrl')
const isWebUrl = frontendAssestUrl.startsWith('http')

const staticDirPath = path.join(__dirname, 'assets')
const webUrl = isWebUrl ? new URL(frontendAssestUrl) : null

const frontendEnv = loadFrontendEnvConfig()
const envString = JSON.stringify(frontendEnv)

const staticMiddleware = isWebUrl
  ? proxy(webUrl?.host ?? '', {
      userResDecorator(proxyRes, proxyResData, ctx) {
        if (ctx.path === '/index.html') {
          return Buffer.from(
            (proxyResData as Buffer)
              .toString()
              .replace(
                /(<script .*?\s* id="telleryBootstrap">\s*)(\{.*?\})(\s*<\/script>)/s,
                (match, p1, p2, p3) => {
                  return `${p1}${envString}${p3}`
                },
              ),
            'utf-8',
          )
        } else {
          return proxyResData
        }
      },
      proxyReqPathResolver: (ctx) => {
        return `${webUrl?.pathname}${ctx.path}`
      },
      https: true,
      preserveHostHdr: true,
    })
  : mount('/', serve(path.join(staticDirPath, 'web')))

export default compose([
  mount('/api/static', serve(path.join(staticDirPath, 'images'))),
  historyApiFallback({ index: '/index.html', whiteList: ['/api'] }),
  staticMiddleware,
])
