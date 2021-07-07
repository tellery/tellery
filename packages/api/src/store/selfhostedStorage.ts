import { getRepository, getConnection } from 'typeorm'
import { FileEntity } from '../entities/file'
import { FileBody } from '../types/file'

export class SelfHostedStorage {
  async putFile(file: FileBody) {
    const { key, workspaceId, content, contentType, size, metadata } = file
    await getRepository(FileEntity).insert({
      id: key,
      workspaceId,
      content,
      contentType,
      size,
      metadata,
    })
  }

  async fetchFile(key: string): Promise<FileBody | null> {
    const entity = await getConnection().getRepository(FileEntity).findOne(key)
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
}

const selfhostedStorage = new SelfHostedStorage()
export default selfhostedStorage
