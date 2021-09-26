import { Readable } from 'stream'
import {
  Collection,
  Database,
  Profile,
  TypeField,
  AvailableConfig,
  ProfileSpec,
  Integration,
} from '../../types/connector'
import { DbtMetadata, ExportedBlockMetadata } from '../../types/dbt'

/**
 * interacting with tellery-connector
 */
export interface IConnectorManager {
  // profile service
  getProfileConfigs(): Promise<AvailableConfig[]>

  getProfileSpec(): Promise<ProfileSpec>

  getProfile(): Promise<Profile | undefined>

  upsertProfile(profileBody: Profile): Promise<Profile>

  getIntegrationConfigs(): Promise<AvailableConfig[]>

  listIntegrations(): Promise<Integration[]>

  upsertIntegration(integrationBody: Integration): Promise<Integration>

  deleteIntegration(integrationId: number): Promise<void>

  // connector service
  listDatabases(): Promise<Database[]>

  /**
   * list all collections of a given database
   * @param database database name, returned by `listDatabases`
   */
  listCollections(database: string): Promise<Collection[]>

  /**
   * get all of the name and type of columns of a given collection
   * @param database database name, returned by `listDatabases`
   * @param collection collection name, returned by `listCollections`
   * @param schema schema name, returned by `listCollections` (before the dot if exists)
   */
  getCollectionSchema(database: string, collection: string, schema?: string): Promise<TypeField[]>

  /**
   * execute sql on a given profile
   * @param flag: connector will use `flag` to mark a certain execution
   */
  executeSql(
    sql: string,
    identifier: string,
    maxRow?: number,
    flag?: string,
    errorHandler?: (e: Error) => void,
  ): Readable

  cancelQuery(identifier: string): void

  /**
   * import a file from url to the data warehouse by connector
   * @param url
   * @param database
   * @param schema
   */
  importFromUrl(
    url: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<{ database: string; collection: string }>

  /**
   * import a file from its body to the data warehouse by connector
   * use when importFromUrl fails
   * @param url
   * @param database
   * @param schema
   */
  importFromFile(
    fileBody: Buffer,
    contentType: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<{ database: string; collection: string }>

  // dbt service
  generateKeyPair(): Promise<string>

  /**
   * pull dbt repo and retrieve dbt metadata
   */
  pullRepo(): Promise<DbtMetadata[]>

  /**
   * push blocks that are descendance of dbt blocks (as dbt models) into its repo
   * @param blocks blocks that are descendance of dbtBlocks
   */
  pushRepo(blocks: ExportedBlockMetadata[]): Promise<void>
}
