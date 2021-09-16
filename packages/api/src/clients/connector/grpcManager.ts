import { Transform, TransformCallback } from 'stream'
import { credentials, ChannelCredentials, Metadata } from 'grpc'
import { Empty } from 'google-protobuf/google/protobuf/empty_pb'
import _ from 'lodash'
import { AuthType, AuthData } from '../../types/auth'
import { ConnectorServiceClient } from '../../protobufs/connector_grpc_pb'
import { DbtServiceClient } from '../../protobufs/dbt_grpc_pb'
import { ProfileServiceClient } from '../../protobufs/profile_grpc_pb'
import { SQLType } from '../../protobufs/sqlType_pb'
import { DisplayType } from '../../protobufs/displayType_pb'
import {
  GetCollectionRequest,
  GetCollectionSchemaRequest,
  SubmitQueryRequest,
  QueryResult,
  ImportRequest,
} from '../../protobufs/connector_pb'
import { DbtBlock, PushRepoRequest, QuestionBlockContent } from '../../protobufs/dbt_pb'
import {
  Profile as ProfilePb,
  Integration as IntegrationPb,
  UpsertProfileRequest,
  DeleteIntegrationRequest,
  UpsertIntegrationRequest,
} from '../../protobufs/profile_pb'
import { AvailableConfig as AvailableConfigPb } from '../../protobufs/config_pb'
import { IConnectorManager } from './interface'
import {
  Profile,
  TypeField,
  Collection,
  Database,
  AvailableConfig,
  ProfileSpec,
  Integration,
} from '../../types/connector'
import { DbtMetadata, ExportedBlockMetadata } from '../../types/dbt'
import { beautyStream, beautyCall } from '../../utils/grpc'
import { KVEntry } from '../../protobufs/base_pb'
import { Int32Value } from 'google-protobuf/google/protobuf/wrappers_pb'

// TODO: optimize cache
const grpcConnectorStorage = new Map<string, ConnectorManager>()

function getEnumKey<T>(obj: T, val: T[keyof T]): string {
  return Object.keys(obj)[Object.values(obj).indexOf(val)]
}

export function getGrpcConnector(
  workspaceId: string,
  url: string,
  authType: AuthType,
  authData: AuthData,
): ConnectorManager {
  const key = `${workspaceId}-${url}`
  const cachedConnectorManager = grpcConnectorStorage.get(key)
  if (cachedConnectorManager) {
    if (cachedConnectorManager.checkAuth(authType, authData)) {
      return cachedConnectorManager
    }
    grpcConnectorStorage.delete(key)
  }
  const newConnectorManager = new ConnectorManager(workspaceId, url, authType, authData)
  grpcConnectorStorage.set(key, newConnectorManager)
  return newConnectorManager
}

export class ConnectorManager implements IConnectorManager {
  private workspaceId: string

  private connectorClient: ConnectorServiceClient

  private profileClient: ProfileServiceClient

  private dbtClient: DbtServiceClient

  private authType: AuthType

  private authData: AuthData

  private queryCancelHandler: Map<string, () => void> = new Map()

  constructor(workspaceId: string, url: string, authType: AuthType, authData: AuthData) {
    this.workspaceId = workspaceId
    this.authType = authType
    this.authData = authData
    let credential: ChannelCredentials
    if (this.authType === AuthType.NONE) {
      credential = credentials.createInsecure()
    } else if (this.authType === AuthType.TLS && authData.cert) {
      credential = credentials.createSsl(Buffer.from(authData.cert))
    } else {
      throw new Error(`Invalid auth type for grpcConnector: ${authType}`)
    }
    this.connectorClient = new ConnectorServiceClient(url, credential)
    this.profileClient = new ProfileServiceClient(url, credential)
    this.dbtClient = new DbtServiceClient(url, credential)
  }

  public checkAuth(authType: AuthType, authData: AuthData): boolean {
    return this.authType === authType && this.authData === authData
  }

  private createMetadata(): Metadata {
    const metadata = new Metadata()
    metadata.set('workspaceId', this.workspaceId)
    return metadata
  }

  private renderAvaliableConfig(cfg: AvailableConfigPb): AvailableConfig {
    return {
      type: cfg.getType(),
      configs: cfg.getConfigsList().map((i) => ({
        name: i.getName(),
        type: i.getType(),
        description: i.getDescription(),
        hint: i.getHint(),
        required: i.getRequired(),
        secret: i.getSecret(),
        fillHint: i.getFillhint(),
      })),
    }
  }

  async getProfileConfigs(): Promise<AvailableConfig[]> {
    const configs = await beautyCall(
      this.profileClient.getProfileConfigs,
      this.profileClient,
      new Empty(),
      this.createMetadata(),
    )
    return configs.getAvailableconfigsList().map(this.renderAvaliableConfig)
  }

  async getProfileSpec(): Promise<ProfileSpec> {
    const spec = await beautyCall(
      this.profileClient.getProfileSpec,
      this.profileClient,
      new Empty(),
      this.createMetadata(),
    )
    const rawSpec = JSON.parse(Buffer.from(spec.getQuerybuilderspec(), 'base64').toString())
    const objConverter = (t: { [key: string]: { [key: string]: string } }) =>
      new Map(
        Object.entries(t).flatMap(([k, v]) => {
          const vMap = new Map(Object.entries(v))
          return k.split(',').map((subKey: string) => [subKey, vMap])
        }),
      )
    const queryBuilderSpec = {
      ...rawSpec,
      aggregation: objConverter(rawSpec.aggregation),
      bucketization: objConverter(rawSpec.bucketization),
    }

    return {
      type: spec.getType(),
      tokenizer: Buffer.from(spec.getTokenizer(), 'base64').toString(),
      queryBuilderSpec,
    }
  }

  private renderProfile(item: ProfilePb): Profile {
    return {
      type: item.getType(),
      id: item.getId(),
      configs: Object.fromEntries(item.getConfigsList().map((i) => [i.getKey(), i.getValue()])),
    }
  }

  async getProfile(): Promise<Profile | undefined> {
    try {
      const profile = await beautyCall(
        this.profileClient.getProfile,
        this.profileClient,
        new Empty(),
        this.createMetadata(),
      )
      return this.renderProfile(profile)
    } catch (e: any) {
      // special case for no profile
      if (e.status === 404) {
        return undefined
      }
      throw e
    }
  }

  async upsertProfile(profileBody: Profile): Promise<Profile> {
    const { type, configs } = profileBody
    const request = new UpsertProfileRequest()
      .setType(type)
      .setConfigsList(Object.entries(configs).map(([k, v]) => new KVEntry().setKey(k).setValue(v)))

    const newProfile = await beautyCall(
      this.profileClient.upsertProfile,
      this.profileClient,
      request,
      this.createMetadata(),
    )
    return this.renderProfile(newProfile)
  }

  async getIntegrationConfigs(): Promise<AvailableConfig[]> {
    const configs = await beautyCall(
      this.profileClient.getIntegrationConfigs,
      this.profileClient,
      new Empty(),
      this.createMetadata(),
    )
    return configs.getAvailableconfigsList().map(this.renderAvaliableConfig)
  }

  private renderIntegration(item: IntegrationPb): Integration {
    return {
      id: item.getId(),
      profileId: item.getProfileid(),
      type: item.getType(),
      configs: Object.fromEntries(item.getConfigsList().map((i) => [i.getKey(), i.getValue()])),
    }
  }

  async listIntegrations(): Promise<Integration[]> {
    const integrations = await beautyCall(
      this.profileClient.listIntegrations,
      this.profileClient,
      new Empty(),
      this.createMetadata(),
    )
    return integrations.getIntegrationsList().map(this.renderIntegration)
  }

  async upsertIntegration(integrationBody: Integration): Promise<Integration> {
    const { id, profileId, type, configs } = integrationBody

    const request = new UpsertIntegrationRequest()
      .setId(new Int32Value().setValue(id))
      .setProfileid(profileId)
      .setType(type)
      .setConfigsList(Object.entries(configs).map(([k, v]) => new KVEntry().setKey(k).setValue(v)))

    const newIntegration = await beautyCall(
      this.profileClient.upsertIntegration,
      this.profileClient,
      request,
      this.createMetadata(),
    )
    return this.renderIntegration(newIntegration)
  }

  async deleteIntegration(integrationId: number): Promise<void> {
    const request = new DeleteIntegrationRequest().setId(integrationId)
    await beautyCall(
      this.profileClient.deleteIntegration,
      this.profileClient,
      request,
      this.createMetadata(),
    )
  }

  async listDatabases(): Promise<Database[]> {
    const databases = await beautyCall(
      this.connectorClient.getDatabases,
      this.connectorClient,
      new Empty(),
      this.createMetadata(),
    )
    return databases.getDatabaseList()
  }

  async listCollections(database: string): Promise<Collection[]> {
    const request = new GetCollectionRequest().setDatabase(database)
    const collections = await beautyCall(
      this.connectorClient.getCollections,
      this.connectorClient,
      request,
      this.createMetadata(),
    )
    return collections
      .getCollectionsList()
      .map(
        (item) =>
          `${item.hasSchema() ? item.getSchema() : ''}${
            item.hasSchema() ? '.' : ''
          }${item.getCollection()}`,
      )
  }

  async getCollectionSchema(
    database: string,
    collection: string,
    schema?: string,
  ): Promise<TypeField[]> {
    let request = new GetCollectionSchemaRequest().setDatabase(database).setCollection(collection)
    if (schema) {
      request = request.setSchema(schema)
    }
    const collectionSchema = await beautyCall(
      this.connectorClient.getCollectionSchema,
      this.connectorClient,
      request,
      this.createMetadata(),
    )
    return collectionSchema.getFieldsList().map((item) => ({
      name: item.getName(),
      displayType: getEnumKey(DisplayType, item.getDisplaytype()),
      sqlType: getEnumKey(SQLType, item.getSqltype()),
    }))
  }

  executeSql(
    sql: string,
    identifier: string,
    maxRow?: number,
    flag?: string,
    errorHandler?: (e: Error) => void,
  ): Transform {
    const request = new SubmitQueryRequest()
      .setSql(sql)
      .setMaxrow(maxRow ?? 1000)
      .setQuestionid(flag ?? 'adhoc')
    const resultSetStream = this.connectorClient.query(request, this.createMetadata())
    this.queryCancelHandler.set(identifier, () => resultSetStream.cancel())
    return beautyStream(resultSetStream, errorHandler).pipe(new QueryResultTransformer())
  }

  async cancelQuery(flag: string): Promise<void> {
    const cancelCallback = this.queryCancelHandler.get(flag)
    if (cancelCallback) cancelCallback()
  }

  async importFromFile(
    profile: string,
    url: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<{ database: string; collection: string }> {
    let request = new ImportRequest().setUrl(url).setDatabase(database).setCollection(collection)
    if (schema) {
      request = request.setSchema(schema)
    }
    const importResult = await beautyCall(
      this.connectorClient.importFromFile,
      this.connectorClient,
      request,
      this.createMetadata(),
    )
    return {
      database: importResult.getDatabase(),
      collection: `${
        importResult.hasSchema() ? `${importResult.getSchema()}.` : ''
      }${importResult.getCollection()}`,
    }
  }

  async generateKeyPair(): Promise<string> {
    const res = await beautyCall(
      this.dbtClient.generateKeyPair,
      this.dbtClient,
      new Empty(),
      this.createMetadata(),
    )
    return res.getPublickey()
  }

  async pullRepo(): Promise<DbtMetadata[]> {
    const res = await beautyCall(
      this.dbtClient.pullRepo,
      this.dbtClient,
      new Empty(),
      this.createMetadata(),
    )
    return res.getBlocksList().map(
      (raw) =>
        // remove blank values
        _.pickBy({
          name: raw.getName(),
          description: raw.getDescription(),
          relationName: raw.getRelationname(),
          rawSql: raw.getRawsql(),
          compiledSql: raw.getCompiledsql(),
          type: getEnumKey(DbtBlock.Type, raw.getType()).toLowerCase(),
          materialized: getEnumKey(DbtBlock.Materialization, raw.getMaterialized()).toLowerCase(),
          sourceName: raw.getSourcename(),
        }) as DbtMetadata,
    )
  }

  async pushRepo(blocks: ExportedBlockMetadata[]): Promise<void> {
    const request = new PushRepoRequest().setBlocksList(
      blocks.map(({ sql, name }) => new QuestionBlockContent().setSql(sql).setName(name)),
    )
    await beautyCall(this.dbtClient.pushRepo, this.dbtClient, request, this.createMetadata())
  }

  async getDiffs(): Promise<number> {
    const res = await beautyCall(
      this.dbtClient.getDiffs,
      this.dbtClient,
      new Empty(),
      this.createMetadata(),
    )
    return res.getCount()
  }
}

class QueryResultTransformer extends Transform {
  nonStreamFields: {
    fields: TypeField[]
    truncated: boolean
    upstreamErr?: string
    errMsg?: string
  }

  initialized: boolean

  recordTrailingComma: boolean

  constructor() {
    super({ objectMode: true })
    this.nonStreamFields = {
      fields: [],
      truncated: false,
    }
    this.recordTrailingComma = false
    this.initialized = false
  }

  _transform(row: QueryResult, encoding: BufferEncoding, callback: TransformCallback): void {
    if (!this.initialized) {
      this.push('{')
      this.push(`"records": [`)
      this.initialized = true
    }
    if (row.hasError()) {
      this.nonStreamFields.upstreamErr = 'SQL Exception Error'
      this.nonStreamFields.errMsg = row.getError()
    }
    if (row.hasFields()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.nonStreamFields.fields = row
        .getFields()!
        .getFieldsList()
        .map((item) => ({
          name: item.getName(),
          displayType: getEnumKey(DisplayType, item.getDisplaytype()),
          sqlType: getEnumKey(SQLType, item.getSqltype()),
        }))
    }
    if (row.hasTruncated()) {
      this.nonStreamFields.truncated = row.getTruncated()
    }
    if (row.hasRow()) {
      this.push(
        `${this.recordTrailingComma ? ',' : ''}${Buffer.from(
          row.getRow_asB64(),
          'base64',
        ).toString()}`,
      )
      this.recordTrailingComma = true
    }
    callback()
  }

  _final(callback: (error?: Error | null) => void): void {
    this.push(']')
    Object.entries(this.nonStreamFields).forEach(([k, v]) => {
      this.push(`,"${k}": ${JSON.stringify(v)}`)
    })
    this.push('}')
    callback()
  }
}
