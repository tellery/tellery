import _ from 'lodash'
import { getIPermission, IPermission } from '../core/permission'
import { canGetBlockData } from '../utils/permission'
import { NotFoundError } from '../error/error'
import { getRepository } from 'typeorm'
import BlockEntity from '../entities/block'
import { BlockType } from '../types/block'
import { analyzeSql } from '../utils/analyzeSql'
import { cascadeLoadBlocksByLink } from '../core/block'
import { LinkType } from '../types/link'

export class AnalyzeSqlService {
  private permissions: IPermission

  constructor(p: IPermission) {
    this.permissions = p
  }

  private async retrieveSQL(
    operatorId: string,
    workspaceId: string,
    blockId: string,
  ): Promise<{
    blockId: string
    sql: string
  }> {
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
      return {
        blockId: block.id,
        sql: _.get(block.content, 'sql'),
      }
    }

    throw Error('Unsupported Block Type')
  }

  private async loadAllLinkedBlocks(operatorId: string, workspaceId: string, blockId: string) {
    const { blockId: realBlockId, sql } = await this.retrieveSQL(operatorId, workspaceId, blockId)
    const [downward, upward] = await Promise.all([
      cascadeLoadBlocksByLink([realBlockId], 'backward', LinkType.QUESTION),
      cascadeLoadBlocksByLink([realBlockId], 'forward', LinkType.QUESTION),
    ])
    const blocksMap = new Map<string, BlockEntity>(
      _([...downward, ...upward])
        .uniq()
        .map((b) => [b.id, b] as [string, BlockEntity])
        .value(),
    )
  }

  async analyzeSql(operatorId: string, workspaceId: string, blockId: string) {
    const { blockId: realBlockId, sql } = await this.retrieveSQL(operatorId, workspaceId, blockId)
    const node = await analyzeSql(sql)
    node.blockId = realBlockId
    return node
  }
}

const service = new AnalyzeSqlService(getIPermission())
export default service
