import config from 'config'
import { createServer } from 'http'
import Koa from 'koa'
import koaBody from 'koa-body'
import logger from 'koa-logger'
import 'reflect-metadata'
import { initDatabaseConRetry } from './clients/db/orm'
import './core/block/init'
import error from './middlewares/error'
import frontend from './middlewares/frontend'
import user from './middlewares/user'
import router from './routes'
import { initSocketServer } from './socket/app'
import { isTest } from './utils/env'

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

const app = new Koa()
  .use(
    koaBody({
      jsonLimit: '10mb',
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
  .use(frontend)

app.proxy = true

const server = createServer(app.callback())
server.keepAliveTimeout = config.get<number>('server.keepAliveTimeout')

if (!config.has('socket.url')) {
  initSocketServer(server)
}

if (!isTest()) {
  server.listen(port, () => {
    console.log('Server listening at port %d', port)
  })
}

export default server
