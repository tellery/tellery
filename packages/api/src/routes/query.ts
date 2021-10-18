import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'

import blockService from '../services/block'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'

class DowngradeQueryBuilderRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  queryBuilderId!: string
}

async function downgradeQueryBuilder(ctx: Context) {
  const payload = plainToClass(DowngradeQueryBuilderRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  await blockService.downgradeQueryBuilder(
    user.id,
    payload.workspaceId,
    payload.connectorId,
    payload.queryBuilderId,
  )
  ctx.body = {}
}

const router = new Router()

router.post('/downgradeQueryBuilder', downgradeQueryBuilder)
export default router
