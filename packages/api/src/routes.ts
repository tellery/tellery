import Router from 'koa-router'
import { getRepository } from 'typeorm'
import { UserEntity } from './entities/user'
import routes from './routes/index'

const router = new Router()

router.get('/api/liveness', (ctx) => {
  ctx.body = 'OK'
})
router.get('/api/readiness', async (ctx) => {
  try {
    await getRepository(UserEntity).find({
      take: 1,
    })
    ctx.body = 'OK'
  } catch (_err) {
    ctx.status = 503
    ctx.body = 'Unavailable'
  }
})
router.use(routes.routes(), routes.allowedMethods())

export default router
