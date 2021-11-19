import './core/block/init'
import 'reflect-metadata'

import config from 'config'
import { createServer } from 'http'
import Koa from 'koa'
import koaBody from 'koa-body'
import logger from 'koa-logger'
import mount from 'koa-mount'
import serve from 'koa-static'
import path from 'path'
import { historyApiFallback } from 'koa2-connect-history-api-fallback'

import { initDatabaseConRetry } from './clients/db/orm'
import error from './middlewares/error'
import user from './middlewares/user'
import router from './routes'
import { initSocketServer } from './socket/app'
import { isTest } from './utils/env'
import { injectFrontendEnv } from './utils/frontendInjector'

initDatabaseConRetry(99).catch((err) => console.error(err))

const port = config.get<number>('server.port')
const host = config.get<string | undefined>('server.host')
// check avatar
if (!host) {
  console.error('must set SERVER_HOST')
  process.exit(1)
}
if (config.get('deploy.mode') !== 'local' && !config.has('redis.url')) {
  console.error('non-local deployment requires Redis as cache')
  process.exit(1)
}

const staticDirPath = path.join(__dirname, 'assets')

const app = new Koa()
  .use(
    koaBody({
      multipart: true,
      formidable: {
        maxFieldsSize: 20 * 1024 ** 2, // 20M
      },
    }),
  )
  .use(error)
  .use(logger())
  .use(user)
  .use(router.routes())
  .use(mount('/api/static', serve(path.join(staticDirPath, 'images'))))
  .use(historyApiFallback({ index: '/index.html', whiteList: ['/api'] }))
  .use(mount('/', serve(path.join(staticDirPath, 'web'))))

app.proxy = true

const server = createServer(app.callback())
server.keepAliveTimeout = config.get<number>('server.keepAliveTimeout')

if (!config.has('socket.url')) {
  initSocketServer(server)
}

if (!isTest()) {
  injectFrontendEnv(path.join(staticDirPath, 'web'))
  server.listen(port, () => {
    console.log('Server listening at port %d', port)
  })
}

export default server
