import { plainToClass, Type } from 'class-transformer'
import { IsDefined, IsOptional, IsEnum, IsArray } from 'class-validator'
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
import { SelectBuilder } from '../types/queryBuilder'
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

class ListAvailableConfigsRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string
}

class ListProfilesRequest {
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
  name!: string

  @IsDefined()
  type!: string

  @Type(() => String)
  @IsDefined()
  configs!: Map<string, string>
}

class DeleteProfileRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

class GetProfileSpecRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

class ListDatabasesRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string
}

class ListCollectionsRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  connectorId!: string

  @IsDefined()
  profile!: string

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
  profile!: string

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
  profile!: string

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
  profile!: string

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
  profile!: string

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
        return getIConnectorManager(req.url, req.authType, req.authData)
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

async function listAvailableConfigsRouter(ctx: Context) {
  const payload = plainToClass(ListAvailableConfigsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const manager = await getIConnectorManagerFromDB(payload.connectorId)

  const configs = await connectorService.listAvailableConfigs(manager, user.id, payload.workspaceId)

  ctx.body = { configs }
}

async function listProfilesRouter(ctx: Context) {
  const payload = plainToClass(ListProfilesRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const manager = await getIConnectorManagerFromDB(payload.connectorId)

  const profiles = await connectorService.listProfiles(manager, user.id, payload.workspaceId)

  ctx.body = { profiles }
}

async function upsertProfileRouter(ctx: Context) {
  const payload = plainToClass(UpsertProfileRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const { connectorId, workspaceId, name, type, configs } = payload

  const manager = await getIConnectorManagerFromDB(connectorId)

  const profileBody = {
    name,
    type,
    configs: Object.fromEntries(configs),
  }

  const profiles = await connectorService.upsertProfile(manager, user.id, workspaceId, profileBody)
  ctx.body = { profiles }
}

async function deleteProfileRouter(ctx: Context) {
  const payload = plainToClass(DeleteProfileRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const manager = await getIConnectorManagerFromDB(payload.connectorId)

  const profiles = await connectorService.deleteProfile(
    manager,
    user.id,
    payload.workspaceId,
    payload.profile,
  )

  ctx.body = { profiles }
}

async function getProfileSpecRouter(ctx: Context) {
  const payload = plainToClass(GetProfileSpecRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const manager = await getIConnectorManagerFromDB(payload.connectorId)

  const converter = (
    map: Map<string, Map<string, string>>,
  ): { [key: string]: { [key: string]: string } } =>
    Object.fromEntries(
      Array.from(map.entries()).map(([k, submap]) => [k, Object.fromEntries(submap.entries())]),
    )
  const { name, type, tokenizer, queryBuilderSpec } = await connectorService.getProfileSpec(
    manager,
    user.id,
    payload.workspaceId,
    payload.profile,
  )
  const { aggregation, bucketization } = queryBuilderSpec
  ctx.body = {
    name,
    type,
    tokenizer,
    queryBuilderSpec: {
      ...queryBuilderSpec,
      aggregation: converter(aggregation),
      bucketization: converter(bucketization),
    },
  }
}

async function listDatabasesRouter(ctx: Context) {
  const payload = plainToClass(ListDatabasesRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile } = payload

  const manager = await getIConnectorManagerFromDB(connectorId)

  const databases = await connectorService.listDatabases(manager, user.id, workspaceId, profile)

  ctx.body = { databases }
}

async function listCollectionsRouter(ctx: Context) {
  const payload = plainToClass(ListCollectionsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile, database } = payload

  const manager = await getIConnectorManagerFromDB(connectorId)

  const collections = await connectorService.listCollections(
    manager,
    user.id,
    workspaceId,
    profile,
    database,
  )

  ctx.body = { collections }
}

async function getCollectionSchemaRouter(ctx: Context) {
  const payload = plainToClass(GetCollectionSchemaRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, connectorId, profile, database, collection, schema } = payload

  const manager = await getIConnectorManagerFromDB(connectorId)

  const fields = await connectorService.getCollectionSchema(
    manager,
    user.id,
    workspaceId,
    profile,
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
    const { workspaceId, connectorId, profile, sql, maxRow, questionId } = payload

    const manager = await getIConnectorManagerFromDB(connectorId)

    const { queryBuilderSpec } = await connectorService.getProfileSpec(
      manager,
      user.id,
      workspaceId,
      profile,
    )

    const assembledSql = await translate(sql, { queryBuilderSpec })

    const identifier = nanoid()

    ctx.res.on('close', async () => {
      await connectorService.cancelQuery(manager, identifier)
    })

    await withKeepaliveStream(ctx, async (streamResponse) => {
      const queryResultStream = await connectorService.executeSql(
        manager,
        user.id,
        workspaceId,
        profile,
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
  const { workspaceId, connectorId, profile, key, database, collection, schema } = payload

  const manager = await getIConnectorManagerFromDB(connectorId)

  const correspondingUrl = (await storageService.objectProxy(user.id, workspaceId, key, {
    skipPermissionCheck: true,
    acquireUrlOnly: true,
  })) as string
  if (!correspondingUrl) {
    throw StorageError.notSupportImport()
  }

  const result = await connectorService.importFromFile(
    manager,
    user.id,
    workspaceId,
    profile,
    correspondingUrl,
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
  const { workspaceId, connectorId, profile, queryBuilderId, metricIds, dimensions } = payload

  const manager = await getIConnectorManagerFromDB(connectorId)

  const { queryBuilderSpec } = await connectorService.getProfileSpec(
    manager,
    user.id,
    workspaceId,
    profile,
  )

  const assembledSql = await translateSmartQuery(
    { queryBuilderId, metricIds, dimensions },
    queryBuilderSpec,
  )

  ctx.body = { sql: assembledSql }
}

const router = new Router()

router.post('/list', listConnectorsRouter)
router.post('/add', addConnectorRouter)
router.post('/listAvailableConfigs', listAvailableConfigsRouter)
router.post('/listProfiles', listProfilesRouter)
router.post('/upsertProfile', upsertProfileRouter)
router.post('/deleteProfile', deleteProfileRouter)
router.post('/getProfileSpec', getProfileSpecRouter)
router.post('/listDatabases', listDatabasesRouter)
router.post('/listCollections', listCollectionsRouter)
router.post('/getCollectionSchema', getCollectionSchemaRouter)
router.post('/executeSql', execute)
router.post('/import', importFromFile)
router.post('/translateSmartQuery', translateSmartQueryRouter)

export default router
