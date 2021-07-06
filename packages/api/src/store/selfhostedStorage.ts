import { Connection, getConnection } from 'typeorm'
import { FileEntity } from '../entities/file'

export class SelfHostedStorage {
  connection!: Connection

  async putFile(
    key: string,
    content: Buffer,
    metadata: Record<string, string | number | boolean | undefined> = {},
  ) {
    await this.getConnection().getRepository(FileEntity).insert({
      id: key,
      content,
      metadata,
    })
  }

  async fetchFile(key: string): Promise<Buffer | null> {
    const entity = await this.getConnection().getRepository(FileEntity).findOne(key)
    if (!entity) {
      return null
    }
    return entity.content
  }

  private getConnection() {
    if (!this.connection) {
      this.connection = getConnection()
    }
    return this.connection
  }
}

const selfhostedStorage = new SelfHostedStorage()
export default selfhostedStorage
