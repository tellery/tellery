import { createServer } from 'http'
import config from 'config'
import Koa from 'koa'
import koaBody from 'koa-body'
import logger from 'koa-logger'

import error from '../middlewares/error'
import { initSocketServer } from './app'
import router from './routers'

const port = config.get<number>('server.port')

const app = new Koa().use(koaBody()).use(error).use(logger()).use(router.routes())
const server = createServer(app.callback())

initSocketServer(server)

server.listen(port, () => {
  console.log('Server listening at port %d', port)
})

export default server
