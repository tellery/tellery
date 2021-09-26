import { plainToClass, Type } from 'class-transformer'
import { IsDefined, IsOptional, IsEnum, IsArray, IsInt } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { nanoid } from 'nanoid'
import { getIConnectorManager, getIConnectorManagerFromDB } from '../clients/connector'
import connectorService from '../services/connector'
import storageService from '../services/storage'
import { AuthData, AuthType } from '../types/auth'
import { errorResponse, validate } from '../utils/http'
import { mustGetUser } from '../utils/user'
import { streamHttpErrorCb, withKeepaliveStream } from '../utils/stream'
import { StorageError, UnauthorizedError } from '../error/error'
import { translate } from '../core/translator'
import { filterSpec, SelectBuilder } from '../types/queryBuilder'
import { translateSmartQuery } from '../core/translator/smartQuery'

class AddConnectorRequest {
  @IsDefined()
  workspaceId!: string

  url!: string

  @IsDefined()
  @IsEnum(AuthType)
  authType!: AuthType

  @IsOptional()
  authData?: AuthData

  @IsDefined()
  name!: string
}

class ListConnectorsRequest {
  @IsDefined()
  workspaceId!: string
}

class GetProfileConfigsRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class GetProfileSpecRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}
class GetProfileRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class UpsertProfileRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  type!: string

  @Type(() => String)
  @IsDefined()
  configs!: Map<string, string>
}

class GetIntegrationConfigsRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class ListIntegrationsRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class UpsertIntegrationRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  @IsInt()
  id!: number

  @IsDefined()
  type!: string

  @Type(() => String)
  @IsDefined()
  configs!: Map<string, string>
}

class DeleteIntegrationRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  @IsInt()
  id!: number
}

class ListDatabasesRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class ListCollectionsRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  database!: string

  schema?: string
}

class GetCollectionSchemaRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  database!: string

  @IsDefined()
  collection!: string

  schema?: string
}

class ExecuteSqlRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  sql!: string

  questionId?: string

  maxRow?: number
}

class ImportRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  database!: string

  @IsDefined()
  collection!: string

  schema?: string

  @IsDefined()
  key!: string
}

class TranslateSmartQueryRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  queryBuilderId!: string

  @IsDefined()
  @IsArray()
  @Type(() => String)
  metricIds!: string[]

  @IsDefined()
  @IsArray()
  @Type(() => Object)
  dimensions!: SelectBuilder[]
}

async function listConnectorsRouter(ctx: Context) {
  const payload = plainToClass(ListConnectorsRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const connectors = await connectorService.listConnectors(user.id, payload.workspaceId)
  ctx.body = { connectors }
}

async function addConnectorRouter(ctx: Context) {
  const payload = plainToClass(AddConnectorRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const id = await connectorService.addConnector(
    (req) => {
      try {
        return getIConnectorManager(payload.workspaceId, req.url, req.authType, req.authData)
      } catch (err: any) {
        return ctx.throw(400, errorResponse(err.toString()))
      }
    },
    user.id,
    payload.workspaceId,
    { authData: {}, ...payload },
  )

  ctx.body = { id }
}

async function getProfileConfigsRouter(ctx: Context) {
  const payload = plainToClass(GetProfileConfigsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const manager = await getIConnectorManagerFromDB(payload.workspaceId, payload.connectorId)

  const configs = await connectorService.getProfileConfigs(manager, user.id, payload.workspaceId)

  ctx.body = { configs }
}

async function getProfileSpecRouter(ctx: Context) {
  const payload = plainToClass(GetProfileSpecRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const manager = await getIConnectorManagerFromDB(payload.workspaceId, payload.connectorId)

  const converter = (
    map: Map<string, Map<string, string>>,
  ): { [key: string]: { [key: string]: string } } =>
    Object.fromEntries(
      Array.from(map.entries()).map(([k, submap]) => [k, Object.fromEntries(submap.entries())]),
    )
  const { type, tokenizer, queryBuilderSpec } = await connectorService.getProfileSpec(
    manager,
    user.id,
    payload.workspaceId,
  )
  const { aggregation, bucketization } = queryBuilderSpec
  ctx.body = {
    type,
    tokenizer,
    queryBuilderSpec: {
      ...queryBuilderSpec,
      aggregation: converter(aggregation),
      bucketization: converter(bucketization),
      filter: filterSpec,
    },
  }
}

async function getProfileRouter(ctx: Context) {
  const payload = plainToClass(GetProfileRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { workspaceId, connectorId } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const profile = await connectorService.getProfile(manager, user.id, payload.workspaceId)

  ctx.body = { profile }
}

async function upsertProfileRouter(ctx: Context) {
  const payload = plainToClass(UpsertProfileRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { workspaceId, connectorId, type, configs } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const profileBody = {
    id: workspaceId,
    type,
    configs: Object.fromEntries(configs),
  }

  const profile = await connectorService.upsertProfile(manager, user.id, workspaceId, profileBody)
  ctx.body = { profile }
}

async function getIntegrationConfigsRouter(ctx: Context) {
  const payload = plainToClass(GetIntegrationConfigsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { workspaceId, connectorId } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const configs = await connectorService.getIntegrationConfigs(
    manager,
    user.id,
    payload.workspaceId,
  )

  ctx.body = { configs }
}

async function listIntegrationsRouter(ctx: Context) {
  const payload = plainToClass(ListIntegrationsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { workspaceId, connectorId } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const integrations = await connectorService.listIntegrations(
    manager,
    user.id,
    payload.workspaceId,
  )
  ctx.body = { integrations }
}

async function upsertIntegrationRouter(ctx: Context) {
  const payload = plainToClass(UpsertIntegrationRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { workspaceId, connectorId, id, type, configs } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const integraionBody = {
    id,
    profileId: workspaceId,
    type,
    configs: Object.fromEntries(configs),
  }

  const integration = await connectorService.upsertIntegration(
    manager,
    user.id,
    workspaceId,
    integraionBody,
  )
  ctx.body = { integration }
}

async function deleteIntegrationRouter(ctx: Context) {
  const payload = plainToClass(DeleteIntegrationRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { workspaceId, connectorId, id } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  await connectorService.deleteIntegration(manager, user.id, workspaceId, id)
  ctx.body = {}
}

async function listDatabasesRouter(ctx: Context) {
  const payload = plainToClass(ListDatabasesRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const databases = await connectorService.listDatabases(manager, user.id, workspaceId)

  ctx.body = { databases }
}

async function listCollectionsRouter(ctx: Context) {
  const payload = plainToClass(ListCollectionsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, database } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const collections = await connectorService.listCollections(
    manager,
    user.id,
    workspaceId,
    database,
  )

  ctx.body = { collections }
}

async function getCollectionSchemaRouter(ctx: Context) {
  const payload = plainToClass(GetCollectionSchemaRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, database, collection, schema } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const fields = await connectorService.getCollectionSchema(
    manager,
    user.id,
    workspaceId,
    database,
    collection,
    schema,
  )

  ctx.body = { fields }
}

async function execute(ctx: Context) {
  try {
    const payload = plainToClass(ExecuteSqlRequest, ctx.request.body)
    await validate(ctx, payload)
    const user = mustGetUser(ctx)
    const { workspaceId, connectorId, sql, maxRow = 1000, questionId } = payload

    const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

    const { queryBuilderSpec } = await connectorService.getProfileSpec(
      manager,
      user.id,
      workspaceId,
    )

    const assembledSql = await translate(sql, { queryBuilderSpec }, maxRow)

    const identifier = nanoid()

    ctx.res.on('close', async () => {
      await connectorService.cancelQuery(manager, identifier)
    })

    await withKeepaliveStream(ctx, async (streamResponse) => {
      const queryResultStream = await connectorService.executeSql(
        manager,
        user.id,
        workspaceId,
        assembledSql,
        identifier,
        maxRow,
        questionId,
        streamHttpErrorCb(streamResponse),
      )
      queryResultStream.pipe(streamResponse)
    })
  } catch (err: any) {
    if (!(err instanceof UnauthorizedError)) {
      // override the status code, therefore the error would appear in the sql editor correctly
      err.status = 200
    }
    throw err
  }
}

async function importFromFile(ctx: Context) {
  const payload = plainToClass(ImportRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, key, database, collection, schema } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const result = await connectorService.importFromFile(
    manager,
    user.id,
    workspaceId,
    key,
    database,
    collection,
    schema,
  )

  ctx.body = result
}

async function translateSmartQueryRouter(ctx: Context) {
  const payload = plainToClass(TranslateSmartQueryRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, queryBuilderId, metricIds, dimensions } = payload

  const manager = await getIConnectorManagerFromDB(workspaceId, connectorId)

  const { queryBuilderSpec } = await connectorService.getProfileSpec(manager, user.id, workspaceId)

  const assembledSql = await translateSmartQuery(
    { queryBuilderId, metricIds, dimensions },
    queryBuilderSpec,
  )

  ctx.body = { sql: assembledSql }
}

const router = new Router()

router.post('/list', listConnectorsRouter)
router.post('/add', addConnectorRouter)

router.post('/getProfileConfigs', getProfileConfigsRouter)
router.post('/getProfileSpec', getProfileSpecRouter)
router.post('/getProfile', getProfileRouter)
router.post('/upsertProfile', upsertProfileRouter)

router.post('/getIntegrationConfigs', getIntegrationConfigsRouter)
router.post('/listIntegrations', listIntegrationsRouter)
router.post('/upsertIntegration', upsertIntegrationRouter)
router.post('/deleteIntegration', deleteIntegrationRouter)

router.post('/listDatabases', listDatabasesRouter)
router.post('/listCollections', listCollectionsRouter)
router.post('/getCollectionSchema', getCollectionSchemaRouter)
router.post('/executeSql', execute)
router.post('/import', importFromFile)
router.post('/translateSmartQuery', translateSmartQueryRouter)

export default router
