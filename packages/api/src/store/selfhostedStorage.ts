import { Connection, getConnection } from 'typeorm'
import { FileEntity } from '../entities/file'
import { FileBody } from '../types/file'

export class SelfHostedStorage {
  connection!: Connection

  async putFile(file: FileBody) {
    const { key, workspaceId, content, contentType, size, metadata } = file
    await this.getConnection().getRepository(FileEntity).insert({
      id: key,
      workspaceId,
      content,
      contentType,
      size,
      metadata,
    })
  }

  async fetchFile(key: string): Promise<FileBody | null> {
    const entity = await this.getConnection().getRepository(FileEntity).findOne(key)
    if (!entity) {
      return null
    }
    if (!entity) {
      return null
    }
    const { workspaceId, content, contentType, size, metadata } = entity
    return {
      key,
      workspaceId,
      content,
      contentType,
      size,
      metadata,
    }
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
