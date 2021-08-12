import { Transform, TransformCallback } from 'stream'
import { credentials, ChannelCredentials } from 'grpc'
import { Empty } from 'google-protobuf/google/protobuf/empty_pb'
import _ from 'lodash'
import { Profile, TypeField, Collection, Database, AvailableConfig } from '../../types/connector'
import { AuthType, AuthData } from '../../types/auth'
import {
  GetDatabaseRequest,
  GetCollectionRequest,
  GetCollectionSchemaRequest,
  UpsertProfileRequest,
  DeleteProfileRequest,
  SubmitQueryRequest,
  QueryResult,
  ImportRequest,
  KVEntry,
  ProfileBody,
} from '../../protobufs/connector_pb'
import { SQLType } from '../../protobufs/sqlType_pb'
import { DisplayType } from '../../protobufs/displayType_pb'
import { ConnectorClient } from '../../protobufs/connector_grpc_pb'
import { IConnectorManager } from './interface'
import { beautyStream, beautyCall } from '../../utils/grpc'
import { DbtClient } from '../../protobufs/dbt_grpc_pb'
import {
  GenerateKeyPairRequest,
  DbtBlock,
  PullRepoRequest,
  PushRepoRequest,
  QuestionBlockContent,
} from '../../protobufs/dbt_pb'
import { DbtMetadata, ExportedBlockMetadata } from '../../types/dbt'

const grpcConnectorStorage = new Map<string, ConnectorManager>()

function getEnumKey<T>(obj: T, val: T[keyof T]): string {
  return Object.keys(obj)[Object.values(obj).indexOf(val)]
}

export function getGrpcConnector(
  url: string,
  authType: AuthType,
  authData: AuthData,
): ConnectorManager {
  if (grpcConnectorStorage.has(url)) {
    const cachedConnectorManager = grpcConnectorStorage.get(url)!
    if (cachedConnectorManager.checkAuth(authType, authData)) {
      return cachedConnectorManager
    }
    grpcConnectorStorage.delete(url)
  }
  const newConnectorManager = new ConnectorManager(url, authType, authData)
  grpcConnectorStorage.set(url, newConnectorManager)
  return newConnectorManager
}

export class ConnectorManager implements IConnectorManager {
  private client: ConnectorClient

  private dbtClient: DbtClient

  private authType: AuthType

  private authData: AuthData

  private queryCancelHandler: Map<string, () => void> = new Map()

  constructor(url: string, authType: AuthType, authData: AuthData) {
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
    this.client = new ConnectorClient(url, credential)
    this.dbtClient = new DbtClient(url, credential)
  }

  public checkAuth(authType: AuthType, authData: AuthData): boolean {
    return this.authType === authType && this.authData === authData
  }

  async listAvailableConfigs(): Promise<AvailableConfig[]> {
    const configs = await beautyCall(this.client.getAvailableConfigs, this.client, new Empty())
    return configs.getAvailableconfigsList().map((cfg) => ({
      type: cfg.getType(),
      configs: cfg.getConfigsList().map((i) => i.toObject()),
    }))
  }

  private profileToObject(item: ProfileBody): Profile {
    return {
      type: item.getType(),
      name: item.getName(),
      configs: Object.fromEntries(item.getConfigsMap().toArray()),
    }
  }

  async listProfiles(): Promise<Profile[]> {
    const profiles = await beautyCall(this.client.getProfiles, this.client, new Empty())
    return profiles.getProfilesList().map(this.profileToObject)
  }

  async upsertProfile(profileBody: Profile): Promise<Profile[]> {
    const { name, type, configs } = profileBody

    const request = new UpsertProfileRequest()
      .setName(name)
      .setType(type)
      .setConfigsList(Object.entries(configs).map(([k, v]) => new KVEntry().setKey(k).setValue(v)))

    const newProfiles = await beautyCall(this.client.upsertProfile, this.client, request)
    return newProfiles.getProfilesList().map(this.profileToObject)
  }

  async deleteProfile(name: string): Promise<Profile[]> {
    const request = new DeleteProfileRequest().setName(name)
    const newProfiles = await beautyCall(this.client.deleteProfile, this.client, request)
    return newProfiles.getProfilesList().map(this.profileToObject)
  }

  async listDatabases(profile: string): Promise<Database[]> {
    const request = new GetDatabaseRequest().setProfile(profile)
    const databases = await beautyCall(this.client.getDatabases, this.client, request)
    return databases.getDatabaseList()
  }

  async listCollections(profile: string, database: string): Promise<Collection[]> {
    const request = new GetCollectionRequest().setProfile(profile).setDatabase(database)
    const collections = await beautyCall(this.client.getCollections, this.client, request)
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
    profile: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<TypeField[]> {
    let request = new GetCollectionSchemaRequest()
      .setProfile(profile)
      .setDatabase(database)
      .setCollection(collection)
    if (schema) {
      request = request.setSchema(schema)
    }
    const collectionSchema = await beautyCall(this.client.getCollectionSchema, this.client, request)
    return collectionSchema.getFieldsList().map((item) => ({
      name: item.getName(),
      displayType: getEnumKey(DisplayType, item.getDisplaytype()),
      sqlType: getEnumKey(SQLType, item.getSqltype()),
    }))
  }

  executeSql(
    profile: string,
    sql: string,
    identifier: string,
    maxRow?: number,
    flag?: string,
    errorHandler?: (e: Error) => void,
  ): Transform {
    const request = new SubmitQueryRequest()
      .setProfile(profile)
      .setSql(sql)
      .setMaxrow(maxRow || 1000)
      .setQuestionid(flag || 'adhoc')
    const resultSetStream = this.client.query(request)
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
    let request = new ImportRequest()
      .setUrl(url)
      .setProfile(profile)
      .setDatabase(database)
      .setCollection(collection)
    if (schema) {
      request = request.setSchema(schema)
    }
    const importResult = await beautyCall(this.client.importFromFile, this.client, request)
    return {
      database: importResult.getDatabase(),
      collection: `${
        importResult.hasSchema() ? `${importResult.getSchema()}.` : ''
      }${importResult.getCollection()}`,
    }
  }

  async generateKeyPair(profile: string): Promise<string> {
    const request = new GenerateKeyPairRequest().setProfile(profile)
    const res = await beautyCall(this.dbtClient.generateKeyPair, this.dbtClient, request)
    return res.getPublickey()
  }

  async pullRepo(profile: string): Promise<DbtMetadata[]> {
    const request = new PullRepoRequest().setProfile(profile)
    const res = await beautyCall(this.dbtClient.pullRepo, this.dbtClient, request)
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

  async pushRepo(profile: string, blocks: ExportedBlockMetadata[]): Promise<void> {
    const request = new PushRepoRequest()
      .setProfile(profile)
      .setBlocksList(
        blocks.map(({ sql, name }) => new QuestionBlockContent().setSql(sql).setName(name)),
      )
    await beautyCall(this.dbtClient.pushRepo, this.dbtClient, request)
  }
}

class QueryResultTransformer extends Transform {
  nonStreamFields: {
    fields: TypeField[]
    truncated: boolean
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
    if (row.hasFields()) {
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
