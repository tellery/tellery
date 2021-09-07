import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { getIConnectorManagerFromDB } from '../clients/connector'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'
import dbtService from '../services/dbt'

class GenerateKeyPairRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class PullRepoRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class PushRepoRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

async function generateKeyPair(ctx: Context) {
  const payload = plainToClass(GenerateKeyPairRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId } = payload
  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)
  const publicKey = await dbtService.generateKeyPair(manager, user.id, payload.workspaceId)
  ctx.body = {
    publicKey,
  }
}

async function pullRepo(ctx: Context) {
  const payload = plainToClass(PullRepoRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId } = payload
  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)
  await dbtService.pullRepo(manager, user.id, payload.workspaceId)
  ctx.body = {}
}

async function pushRepo(ctx: Context) {
  const payload = plainToClass(PushRepoRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId } = payload
  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)
  await dbtService.pushRepo(manager, user.id, payload.workspaceId)
  ctx.body = {}
}

const router = new Router()

router.post('/generateKeyPair', generateKeyPair)
router.post('/pullRepo', pullRepo)
router.post('/pushRepo', pushRepo)

export default router
