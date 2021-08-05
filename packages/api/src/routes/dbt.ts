import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import { getIConnectorManagerFromDB } from '../clients/connector'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'
import dbtService from '../services/dbt'
import Router from 'koa-router'

class GenerateKeyPairRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

class PullRepoRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

class PushRepoRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

class UpdateDbtBlocksRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

async function generateKeyPair(ctx: Context) {
  const payload = plainToClass(GenerateKeyPairRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile } = payload
  const manager = await getIConnectorManagerFromDB(connectorId)
  const publicKey = await dbtService.generateKeyPair(manager, user.id, workspaceId, profile)
  ctx.body = {
    publicKey,
  }
}

async function pullRepo(ctx: Context) {
  const payload = plainToClass(PullRepoRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile } = payload
  const manager = await getIConnectorManagerFromDB(connectorId)
  await dbtService.pullRepo(manager, user.id, workspaceId, profile)
  ctx.body = {}
}

async function pushRepo(ctx: Context) {
  const payload = plainToClass(PushRepoRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile } = payload
  const manager = await getIConnectorManagerFromDB(connectorId)
  await dbtService.pushRepo(manager, user.id, workspaceId, profile)
  ctx.body = {}
}

async function updateDbtBlocks(ctx: Context) {
  const payload = plainToClass(UpdateDbtBlocksRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile } = payload
  const manager = await getIConnectorManagerFromDB(connectorId)
  await dbtService.updateDbtBlocks(manager, user.id, workspaceId, profile)
  ctx.body = {}
}

const router = new Router()

router.post('/generateKeyPair', generateKeyPair)
router.post('/pullRepo', pullRepo)
router.post('/pushRepo', pushRepo)
router.post('/updateDbtBlocks', updateDbtBlocks)

export default router