import { Readable } from 'stream'
import {
  Collection,
  Database,
  Profile,
  TypeField,
  AvailableConfig,
  ProfileSpec,
} from '../../types/connector'
import { DbtMetadata, ExportedBlockMetadata } from '../../types/dbt'

/**
 * interacting with tellery-connector
 */
export interface IConnectorManager {
  /**
   * list all available configs (i.e. db type, supported options, etc.) of a given connector
   */
  listAvailableConfigs(): Promise<AvailableConfig[]>

  /**
   * get specification of a given profile (of its type)
   */
  getProfileSpec(profile: string): Promise<ProfileSpec>

  /**
   * list all profiles
   * (Note: only profiles loaded by connector will be returned, which means that if your profile were not correctly configured, it may not be returned here)
   */
  listProfiles(): Promise<Profile[]>

  /**
   * upsert profile (distinguished by its name)
   * @param newProfile upserted profile body
   * @returns all loaded profiles after upsertion
   */
  upsertProfile(profileBody: Profile): Promise<Profile[]>

  /**
   * delete profile
   * @param profile profile name
   * @returns all loaded profiles after deletion
   */
  deleteProfile(profile: string): Promise<Profile[]>

  /**
   * list all databases of a given profile
   * @param profile profile name, returned by `listProfiles`
   */
  listDatabases(profile: string): Promise<Database[]>

  /**
   * list all collections of a given database
   * @param profile profile name
   * @param database database name, returned by `listDatabases`
   */
  listCollections(profile: string, database: string): Promise<Collection[]>

  /**
   * get all of the name and type of columns of a given collection
   * @param profile profile name
   * @param database database name, returned by `listDatabases`
   * @param collection collection name, returned by `listCollections`
   * @param schema schema name, returned by `listCollections` (before the dot if exists)
   */
  getCollectionSchema(
    profile: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<TypeField[]>

  /**
   * execute sql on a given profile
   * @param flag: connector will use `flag` to mark a certain execution
   */
  executeSql(
    profile: string,
    sql: string,
    identifier: string,
    maxRow?: number,
    flag?: string,
    errorHandler?: (e: Error) => void,
  ): Readable

  cancelQuery(identifier: string): void

  /**
   * import a file from url to the data warehouse by connector
   * @param profile
   * @param url
   * @param database
   * @param schema
   */
  importFromFile(
    profile: string,
    url: string,
    database: string,
    collection: string,
    schema?: string,
  ): Promise<{ database: string; collection: string }>

  // dbt related

  /**
   * generate key pair for pulling repo
   * @param profile profile name
   * @returns public key
   */
  generateKeyPair(profile: string): Promise<string>

  /**
   * pull dbt repo and retrieve dbt metadata
   * @param profile profile name
   * @returns dbt metadata
   */
  pullRepo(profile: string): Promise<DbtMetadata[]>

  /**
   * push blocks that are descendance of dbt blocks (as dbt models) into its repo
   * @param profile profile name
   * @param blocks blocks that are descendance of dbtBlocks
   */
  pushRepo(profile: string, blocks: ExportedBlockMetadata[]): Promise<void>
}
