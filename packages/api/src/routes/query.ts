import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { getIConnectorManagerFromDB } from '../clients/connector'

import blockService from '../services/block'
import connectorService from '../services/connector'
import { getOperationService } from '../services/operation'
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

  const { workspaceId, connectorId, queryBuilderId } = payload

  // load sql builder
  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)
  const { queryBuilderSpec } = await connectorService.getProfileSpec(manager, user.id, workspaceId)

  await blockService.downgradeQueryBuilder(
    user.id,
    workspaceId,
    queryBuilderId,
    queryBuilderSpec,
    getOperationService(),
  )

  ctx.body = { success: true }
}

const router = new Router()

router.post('/downgradeQueryBuilder', downgradeQueryBuilder)
export default router
