import Router from 'koa-router'
import { Context } from 'koa'
import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { mustGetUser } from '../utils/user'
import { validate } from '../utils/http'
import thoughtService from '../services/thought'

class LoadAllThoughtsRequest {
  @IsDefined()
  workspaceId!: string
}

async function loadAllThoughts(ctx: Context) {
  const payload = plainToClass(LoadAllThoughtsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const thoughtsIds = await thoughtService.loadAllThoughts(payload.workspaceId, user.id)
  ctx.body = {
    thoughts: thoughtsIds,
  }
}

const router = new Router()

router.post('/loadAll', loadAllThoughts)

export default router
