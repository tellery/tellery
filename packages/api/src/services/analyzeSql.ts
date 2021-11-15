import _ from 'lodash'
import { getIPermission, IPermission } from '../core/permission'
import { canGetBlockData } from '../utils/permission'
import { NotFoundError } from '../error/error'
import { getRepository } from 'typeorm'
import BlockEntity from '../entities/block'
import { BlockType } from '../types/block'
import { analyzeSql } from '../utils/analyzeSql'

export class AnalyzeSqlService {
  private permissions: IPermission

  constructor(p: IPermission) {
    this.permissions = p
  }

  private async retrieveSQL(
    operatorId: string,
    workspaceId: string,
    blockId: string,
  ): Promise<string> {
    await canGetBlockData(this.permissions, operatorId, workspaceId, blockId)
    if (!blockId) {
      throw NotFoundError.resourceNotFound(blockId)
    }
    const block = await getRepository(BlockEntity).findOne(blockId)
    if (!block) {
      throw NotFoundError.resourceNotFound(blockId)
    }
    if (block.type === BlockType.VISUALIZATION) {
      return this.retrieveSQL(operatorId, workspaceId, (block.children ?? [])[0])
    }
    if ([BlockType.QUERY_BUILDER, BlockType.SQL].includes(block.type)) {
      return _.get(block.content, 'sql')
    }

    throw Error('Unsupported Block Type')
  }

  async analyzeSql(operatorId: string, workspaceId: string, blockId: string) {
    const sql = await this.retrieveSQL(operatorId, workspaceId, blockId)
    const node = await analyzeSql(sql)
    node.blockId = blockId
    return node
  }
}

const service = new AnalyzeSqlService(getIPermission())
export default service
