import Router from 'koa-router'
import internals from './internals'

const router = new Router({
  prefix: '/api/socket',
})

router.use('/internals', internals.routes(), internals.allowedMethods())

export default router
