import Router from 'koa-router'
import workspaces from './workspace'

const router = new Router()
router.use('/workspaces', workspaces.routes(), workspaces.allowedMethods())

export default router
