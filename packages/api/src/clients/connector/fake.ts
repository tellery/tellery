/* eslint class-methods-use-this: 0 */
import { Readable } from 'stream'
import { Profile, TypeField, Database, Collection, AvailableConfig } from '../../types/connector'
import { DbtMetadata, ExportedBlockMetadata } from '../../types/dbt'
import { IConnectorManager } from './interface'

/**
 * only for test
 */
export class FakeManager implements IConnectorManager {
  async listAvailableConfigs(): Promise<AvailableConfig[]> {
    return []
  }

  async listProfiles(): Promise<Profile[]> {
    return []
  }

  async upsertProfile(_newProfile: Profile): Promise<Profile[]> {
    return []
  }

  async deleteProfile(_profile: string): Promise<Profile[]> {
    return []
  }

  async listDatabases(_profile: string): Promise<Database[]> {
    return []
  }

  async listCollections(_profile: string, _database: string): Promise<Collection[]> {
    return []
  }

  async getCollectionSchema(
    _profile: string,
    _database: string,
    _collection: string,
    _schema?: string,
  ): Promise<TypeField[]> {
    return []
  }

  executeSql(_profile: string, _sql: string, _id: string): Readable {
    return new Readable()
  }

  cancelQuery(_id: string) {
    throw new Error('Method not implemented.')
  }

  async importFromFile(
    _profile: string,
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

  async generateKeyPair(_profile: string): Promise<string> {
    return 'fakePublicKey'
  }

  async pullRepo(_profile: string): Promise<void> {
    return
  }

  async pushRepo(_profile: string, _blocks: ExportedBlockMetadata[]): Promise<void> {
    return
  }

  async listDbtBlocks(_profile: string): Promise<DbtMetadata[]> {
    return []
  }
}
