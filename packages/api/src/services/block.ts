import bluebird from 'bluebird'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { createQueryBuilder, getRepository, In } from 'typeorm'

import { Block } from '../core/block'
import { SmartQueryBlock } from '../core/block/smartQuery'
import { getLinksFromSql, LinkWithStoryId, loadLinkEntitiesByBlockIds } from '../core/link'
import { getIPermission, IPermission } from '../core/permission'
import { translateSmartQuery } from '../core/translator/smartQuery'
import BlockEntity from '../entities/block'
import { BlockDTO, BlockParentType, BlockType, ExportedBlock } from '../types/block'
import { OperationCmdType, OperationTableType } from '../types/operation'
import { defaultPermissions } from '../types/permission'
import { QueryBuilderSpec } from '../types/queryBuilder'
import { isLinkToken, Token } from '../types/token'
import { canGetBlockData, canGetWorkspaceData } from '../utils/permission'
import { OperationService } from './operation'

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
   * operationService is exposed for testing
   */
  async downgradeQueryBuilder(
    operatorId: string,
    workspaceId: string,
    queryBuilderId: string,
    queryBuilderSpec: QueryBuilderSpec,
    operationService: OperationService,
  ): Promise<void> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const downstreamSmartQueries = _(
      await createQueryBuilder(BlockEntity, 'blocks')
        .where('type = :type', { type: BlockType.SMART_QUERY })
        .andWhere("content ->> 'queryBuilderId' = :id", { id: queryBuilderId })
        .andWhere('alive = true')
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

    const opBuilder = (id: string, path: string, args: any) => ({
      cmd: OperationCmdType.SET,
      id,
      path: [path],
      table: OperationTableType.BLOCK,
      args,
    })
    const ops = [
      _(translatedSmartQueries)
        .map(([id, content]) => opBuilder(id, 'content', content))
        .value(),
      _(translatedSmartQueries)
        // take the first
        .map(0)
        .concat([queryBuilderId])
        .map((id) => opBuilder(id, 'type', BlockType.SQL))
        .value(),
    ]
    const failures = await operationService.saveTransactions(
      operatorId,
      _(ops)
        .map((operations) => ({
          id: nanoid(),
          workspaceId,
          operations,
        }))
        .value(),
      { skipPermissionCheck: true },
    )
    if (!_.isEmpty(failures)) {
      throw failures[0].error
    }
  }

  async exportStories(
    operatorId: string,
    workspaceId: string,
    storyIds: string[],
  ): Promise<ExportedBlock[]> {
    const allBlocks = await bluebird.map(
      storyIds,
      async (id) => this.listAccessibleBlocksByStoryId(operatorId, workspaceId, id),
      { concurrency: 10 },
    )
    return _(allBlocks)
      .flatMap((bs) =>
        bs.map((b) => {
          return _.pick(b.toDTO(), [
            'id',
            'type',
            'parentId',
            'parentTable',
            'storyId',
            'content',
            'format',
            'children',
          ])
        }),
      )
      .value()
  }

  async importStories(
    operatorId: string,
    workspaceId: string,
    blocks: ExportedBlock[],
  ): Promise<string[]> {
    const idMap = new Map(blocks.map((it) => [it.id, nanoid()]))
    const importedBlockDTOs = blocks.map((b) =>
      this.explodeExportedBlock(operatorId, workspaceId, b, idMap),
    )
    const entities = _(importedBlockDTOs)
      .map((b) => Block.fromArgs(b).toModel(workspaceId))
      .value()
    await getRepository(BlockEntity).save(entities)
    return _(entities).map('id').value()
  }

  handleContent(content: any, idMap: Map<string, string>) {
    // check title first
    if (content.title) {
      _.range(content.title.length).forEach((index) => {
        const token = content.title[index] as Token
        if (isLinkToken(token)) {
          content.title[index][1][0][2] = idMap.get(token[1][0][2])!
        }
      })
    }
    if (content.sql) {
      const links = getLinksFromSql(content.sql)
      content.sql = _(links)
        .map('blockId')
        .reduce(
          (acc, val) => acc.replace(new RegExp(val, 'g'), idMap.get(val)!),
          content.sql as string,
        )
    }
    return content
  }

  explodeExportedBlock(
    operatorId: string,
    workspaceId: string,
    body: ExportedBlock,
    idMap: Map<string, string>,
  ): BlockDTO {
    const newDate = Date.now()
    const {
      id: oldId,
      type,
      parentId: oldParentId,
      storyId: oldStoryId,
      parentTable,
      content: oldContent,
      format,
      children: oldChildren,
    } = body
    return {
      id: idMap.get(oldId)!,
      type,
      parentId: parentTable === BlockParentType.WORKSPACE ? workspaceId : idMap.get(oldParentId)!,
      parentTable,
      storyId: idMap.get(oldStoryId)!,
      permissions: defaultPermissions,
      content: this.handleContent(oldContent, idMap),
      format,
      children: (oldChildren ?? []).map((i) => idMap.get(i)!),
      alive: true,
      version: 1,
      createdById: operatorId,
      lastEditedById: operatorId,
      createdAt: newDate,
      updatedAt: newDate,
    }
  }
}

const service = new BlockService(getIPermission())
export default service
