import bluebird from 'bluebird'
import _ from 'lodash'
import { createQueryBuilder, getManager, getRepository, In } from 'typeorm'

import { Block } from '../core/block'
import { SmartQueryBlock } from '../core/block/smartQuery'
import { LinkWithStoryId, loadLinkEntitiesByBlockIds } from '../core/link'
import { getIPermission, IPermission } from '../core/permission'
import { translateSmartQuery } from '../core/translator/smartQuery'
import BlockEntity from '../entities/block'
import { BlockDTO, BlockParentType, BlockType } from '../types/block'
import { QueryBuilderSpec } from '../types/queryBuilder'
import { canGetBlockData, canGetWorkspaceData } from '../utils/permission'

export class BlockService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  /**
   * get all blocks of a story which in story's children and parent block's children
   */
  async listAccessibleBlocksByStoryId(
    operatorId: string,
    workspaceId: string,
    storyId: string,
  ): Promise<Block[]> {
    await canGetBlockData(this.permission, operatorId, workspaceId, storyId)

    const blockEntities = await this.listEntitiesByStoryId(storyId)

    const blocks = _(blockEntities)
      .map((b) => Block.fromEntity(b))
      .map((b) => {
        if (!b.alive) {
          this.overrideContent(b)
        }
        return b
      })
      .filter((b1) => {
        if (b1.parentTable === BlockParentType.WORKSPACE) {
          return true
        }
        const parentBlock = _(blockEntities).find((b2) => b1.parentId === b2.id)
        return (parentBlock?.children ?? []).includes(b1.id)
      })
      .value()
    // Getting external blocks
    // Since external block ids will be only in the children of the story, we can only examine the story block
    // if such a property is generalized to all blocks, we have to do a recursive cte query
    const story = _(blockEntities).find((i) => i.parentTable === BlockParentType.WORKSPACE)
    if (story) {
      const externalBlockIds = _(story.children ?? [])
        .difference(_(blocks).map('id').value())
        .value()
      const externalBlockEntities = await getRepository(BlockEntity).find({
        id: In(externalBlockIds),
      })
      const externalBlocks = _(externalBlockEntities)
        .map((b) => Block.fromEntity(b))
        .map((b) => {
          if (!b.alive) {
            this.overrideContent(b)
          }
          return b
        })
        .value()
      return [...blocks, ...externalBlocks]
    }
    return blocks
  }

  async mget(operatorId: string, workspaceId: string, ids: string[]): Promise<BlockDTO[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const models = await getRepository(BlockEntity).find({ id: In(ids) })

    const dtos = await bluebird.map(models, async (model) => {
      const can = await this.permission.canGetBlockData(operatorId, model)
      const dto = Block.fromEntitySafely(model)?.toDTO()
      if (dto) {
        if (!can || !dto.alive) {
          // unset content, format and children
          this.overrideContent(dto)
        }
        if (!can) {
          // unset permissions
          dto.permissions = []
        }
      }
      return dto
    })
    return _(dtos).compact().value()
  }

  listEntitiesByStoryId(storyId: string, alive?: boolean): Promise<BlockEntity[]> {
    return getRepository(BlockEntity).find(_({ storyId, alive }).omitBy(_.isUndefined).value())
  }

  async mgetLinks(
    operatorId: string,
    workspaceId: string,
    ids: string[],
  ): Promise<
    { blockId: string; forwardRefs: LinkWithStoryId[]; backwardRefs: LinkWithStoryId[] }[]
  > {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    // to ensure that the following constructed sql is well-formed
    if (ids.length === 0) {
      return []
    }

    const models = await loadLinkEntitiesByBlockIds(ids)

    // ignore models without permissions
    const filters = await bluebird.filter(models, async (m) => {
      const [source, target] = await Promise.all(
        _([m.sourceBlock, m.targetBlock])
          .map((b) =>
            canGetBlockData(this.permission, operatorId, workspaceId, b)
              .then(() => true)
              .catch(() => false),
          )
          .value(),
      )
      return source && target
    })

    return _(ids)
      .map((id) => ({
        blockId: id,
        forwardRefs: _(filters)
          .filter((m) => m.sourceBlockId === id)
          .map((m) => ({
            storyId: m.targetBlock.storyId,
            blockId: m.targetBlock.id,
            type: m.type,
          }))
          .value(),
        backwardRefs: _(filters)
          .filter((m) => m.targetBlockId === id)
          .map((m) => ({
            storyId: m.sourceBlock.storyId,
            blockId: m.sourceBlock.id,
            type: m.type,
          }))
          .value(),
      }))
      .value()
  }

  /* eslint-disable no-param-reassign */
  private overrideContent(block: Block | BlockDTO) {
    block.content = {}
    block.format = undefined
    block.children = []
  }
  /* eslint-enable no-param-reassign */

  /**
   * Downgrade a query builder to regular SQL query
   * searching for its downstream smartQuery, and translate them to SQL query, then change their type
   * TODO: use a cache to replace getting queryBuilderSpec from the connector
   */
  async downgradeQueryBuilder(
    operatorId: string,
    workspaceId: string,
    queryBuilderId: string,
    queryBuilderSpec: QueryBuilderSpec,
  ): Promise<any> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const downstreamSmartQueries = _(
      await createQueryBuilder(BlockEntity, 'blocks')
        .where('type = :type', { type: BlockType.SMART_QUERY })
        .andWhere("content ->> 'queryBuilderId' = :id", { id: queryBuilderId })
        .getMany(),
    )
      .map((b) => Block.fromEntity(b) as SmartQueryBlock)
      .value()

    const translatedSmartQueries = await bluebird.map(
      downstreamSmartQueries,
      async (b) => {
        const content = b.getContent()
        const sql = await translateSmartQuery(content, queryBuilderSpec)
        return [b.id, { ...content, sql }] as [string, Record<string, unknown>]
      },
      { concurrency: 10 },
    )

    await getManager().transaction(async (t) => {
      await t.getRepository(BlockEntity).update(queryBuilderId, { type: BlockType.SQL })
      await bluebird.map(
        translatedSmartQueries,
        async ([id, content]) =>
          t.getRepository(BlockEntity).update(id, {
            content,
            type: BlockType.SQL,
          }),
        { concurrency: 10 },
      )
    })
  }
}

const service = new BlockService(getIPermission())
export default service
