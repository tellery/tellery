import { getRepository } from 'typeorm'
import { FileEntity } from '../entities/file'
import { FileInfo } from '../types/file'

export class FileService {
  async save(file: FileInfo) {
    const [newFile] = await getRepository(FileEntity).save([file])
    return newFile
  }

  async loadByKey(key: string) {
    return getRepository(FileEntity).find({ key })
  }
}

const service = new FileService()
export default service
