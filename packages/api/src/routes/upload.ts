import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import uploadService from '../services/upload'
import { mustGetUser } from '../utils/user'
import { validate } from '../utils/http'

class ProvisionRequest {
  @IsDefined()
  workspaceId!: string
}

async function provision(ctx: Context) {
  const payload = plainToClass(ProvisionRequest, ctx.request.query)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  ctx.body = await uploadService.provision(user.id, payload.workspaceId)
}

const router = new Router()

router.get('/provision', provision)

export default router
