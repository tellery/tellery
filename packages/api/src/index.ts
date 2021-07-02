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

import { initDatabaseConRetry } from './clients/db/orm'
import error from './middlewares/error'
import user from './middlewares/user'
import router from './routes'
import { initSocketServer } from './socket/app'
import { isTest } from './utils/env'

initDatabaseConRetry(99)

const port = config.get<number>('server.port')
const host = config.get<string | undefined>('server.host')
// check avatar
if (!host) {
  console.error('must set SERVER_HOST')
  process.exit(1)
}

const staticDirPath = path.join(__dirname, 'assets/images')

const app = new Koa()
  .use(koaBody())
  .use(error)
  .use(logger())
  .use(user)
  .use(router.routes())
  .use(mount('/api/static', serve(staticDirPath)))

const server = createServer(app.callback())

if (!config.has('socket.url')) {
  initSocketServer(server)
}

if (!isTest()) {
  server.listen(port, () => {
    console.log('Server listening at port %d', port)
  })
}

export default server
