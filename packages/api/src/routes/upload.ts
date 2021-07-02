import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { InvalidArgumentError } from '../error/error'
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

async function callback(ctx: Context) {
  const { file } = ctx.request.body
  if (!file) {
    throw InvalidArgumentError.new('file info is not found in callback')
  }
  await uploadService.handleCallback(file)
  ctx.body = { file }
}

const router = new Router()

router.get('/provision', provision)
router.post('/callback', callback)

export default router
