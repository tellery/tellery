/* eslint class-methods-use-this: 0 */
import { Readable } from 'stream'
import {
  Profile,
  TypeField,
  Database,
  Collection,
  AvailableConfig,
  ProfileSpec,
  Integration,
} from '../../types/connector'
import { DbtMetadata, ExportedBlockMetadata } from '../../types/dbt'
import { IConnectorManager } from './interface'

/**
 * only for test
 */
export class FakeManager implements IConnectorManager {
  async getProfileConfigs(): Promise<AvailableConfig[]> {
    return []
  }

  async getProfileSpec(): Promise<ProfileSpec> {
    throw new Error('Method not implemented.')
  }

  async getProfile(): Promise<Profile | undefined> {
    return undefined
  }

  async upsertProfile(newProfile: Profile): Promise<Profile> {
    return newProfile
  }

  async getIntegrationConfigs(): Promise<AvailableConfig[]> {
    return []
  }

  async listIntegrations(): Promise<Integration[]> {
    return []
  }

  async upsertIntegration(newIntegration: Integration): Promise<Integration> {
    return newIntegration
  }

  async deleteIntegration(_integrationId: number): Promise<void> {
    return
  }

  async listDatabases(): Promise<Database[]> {
    return []
  }

  async listCollections(_database: string): Promise<Collection[]> {
    return []
  }

  async getCollectionSchema(
    _database: string,
    _collection: string,
    _schema?: string,
  ): Promise<TypeField[]> {
    return []
  }

  executeSql(_sql: string, _id: string): Readable {
    return new Readable()
  }

  cancelQuery(_id: string): void {
    throw new Error('Method not implemented.')
  }

  async importFromFile(
    _url: string,
    _database: string,
    _collection: string,
    _schema?: string,
  ): Promise<{ database: string; collection: string }> {
    return {
      database: '',
      collection: '',
    }
  }

  async generateKeyPair(): Promise<string> {
    return 'fakePublicKey'
  }

  async pullRepo(): Promise<DbtMetadata[]> {
    return []
  }

  async pushRepo(_blocks: ExportedBlockMetadata[]): Promise<void> {
    return
  }
}
