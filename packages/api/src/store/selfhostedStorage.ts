import { getRepository } from 'typeorm'
import { FileEntity } from '../entities/file'
import { FileBody } from '../types/file'

export class SelfHostedStorage {
  async putFile(file: FileBody): Promise<void> {
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
    const entity = await getRepository(FileEntity).findOne(key)
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
