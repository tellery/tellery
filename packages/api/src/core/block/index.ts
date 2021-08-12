import _ from 'lodash'
import { createQueryBuilder, EntityManager, getManager, UpdateQueryBuilder } from 'typeorm'
import { TelleryBaseEntity } from '../../entities/base'

import BlockEntity from '../../entities/block'
import { LinkEntity } from '../../entities/link'
import { InvalidArgumentError } from '../../error/error'
import { BlockDTO, BlockParentType, BlockType } from '../../types/block'
import { EntityType } from '../../types/entity'
import { LinkType } from '../../types/link'
import { defaultPermissions, PermissionModel } from '../../types/permission'
import { Token } from '../../types/token'
import { str2Date, strOrDate2number } from '../../utils/date'
import { removeByPathAndId, setByPath } from '../../utils/updater'
import { Entity } from '../common'
import { Link, updateSourceLinkAlive, updateTargetLinkAlive } from '../link'

export type BlockConstructor = new (
  id: string,
  parentId: string,
  parentTable: BlockParentType,
  storyId: string,
  content: Record<string, unknown>,
  alive: boolean,
  version: number,
  format?: Record<string, unknown>,
  children?: string[],
  createdById?: string,
  lastEditedById?: string,
  createdAt?: Date,
  updatedAt?: Date,
) => Block

const constructs: { [k: string]: BlockConstructor } = {}

export function register(type: BlockType, c: BlockConstructor): void {
  constructs[type] = c
}

/**
 * get the corresponding init function by BlockType
 */
export function getBlockConstructor(type: BlockType): BlockConstructor {
  const c = constructs[type]

  if (!c) {
    throw InvalidArgumentError.new('unknown block type')
  }
  return c
}

export abstract class Block extends Entity {
  static type: BlockType

  id: string

  storyId: string

  parentId: string

  parentTable: BlockParentType

  content: Record<string, unknown>

  format?: Record<string, unknown>

  children?: string[]

  // ------------internal---------------
  // exist when generated by fromEntity()
  permissions?: PermissionModel[]

  workspaceId?: string

  constructor(
    id: string,
    parentId: string,
    parentTable: BlockParentType,
    storyId: string,
    content: Record<string, unknown>,
    alive: boolean,
    version: number,
    format?: Record<string, unknown>,
    children?: string[],
    createdById?: string,
    lastEditedById?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(alive, version, createdById, lastEditedById, createdAt, updatedAt)
    if (!id || !parentId || !parentTable || !storyId) {
      throw InvalidArgumentError.new('id and parentId and parentTable and storyId cannot be empty')
    }
    this.id = id
    this.parentId = parentId
    this.parentTable = parentTable
    this.storyId = storyId
    this.content = content
    this.format = format
    this.children = children
  }

  /**
   * operations executed before saving
   * 1. set permission
   * 2. set workspace
   */
  async preSave(manager: EntityManager): Promise<void> {
    const getParentPermissions = async () =>
      manager
        .getRepository(BlockEntity)
        .findOne(this.storyId)
        .then((model) => model?.permissions)
    this.permissions = await this.getPermissions(getParentPermissions)
  }

  /**
   * operations executed after saving
   * @param origin: block entity before modification, being undefined if it were just created
   */
  async postSave(manager: EntityManager, origin?: Block): Promise<void> {
    // when block content and alive has changed, modify its bidirectional link
    await this.syncLink(manager, origin)
    // sync the alive field to its children
    await this.syncBlocksAlive(manager, origin)
  }

  /**
   * get links from block content
   */
  getLinksFromContent(): Link[] {
    return []
  }

  getEntityType(): EntityType {
    return EntityType.BLOCK
  }

  toModel(workspaceId: string): BlockEntity {
    const pt = this.getPlainText()
    const entity = new BlockEntity()
    entity.id = this.id
    entity.workspaceId = workspaceId
    entity.storyId = this.storyId
    entity.parentId = this.parentId
    entity.parentTable = this.parentTable
    entity.interKey = this.getInterKey()
    entity.type = this.getType()
    entity.content = this.content ?? {}
    entity.format = this.format
    entity.children = this.children
    entity.searchableText = pt
    entity.permissions = this.permissions!
    entity.alive = this.alive
    entity.createdById = this.createdById
    entity.lastEditedById = this.lastEditedById
    return entity
  }

  toDTO(): BlockDTO {
    return {
      id: this.id,
      type: this.getType(),
      parentId: this.parentId,
      parentTable: this.getParentType(),
      storyId: this.storyId,
      content: this.content,
      format: this.format,
      children: this.children,
      permissions: this.permissions ?? defaultPermissions,
      createdAt: strOrDate2number(this.createdAt) || 0,
      updatedAt: strOrDate2number(this.updatedAt) || 0,
      version: this.version,
      createdById: this.createdById,
      lastEditedById: this.lastEditedById,
      alive: this.alive,
    }
  }

  static fromEntity(block: BlockEntity): Block {
    const b = new (getBlockConstructor(block.type))(
      block.id,
      block.parentId,
      block.parentTable,
      block.storyId,
      block.content as Record<string, unknown>,
      block.alive,
      block.version,
      block.format as Record<string, unknown>,
      block.children,
      block.createdById,
      block.lastEditedById,
      block.createdAt,
      block.updatedAt,
    )
    b.permissions = block.permissions
    b.workspaceId = block.workspaceId
    return b
  }

  /**
   * In case of loading a unregistered block type
   */
  static fromEntitySafely(block: BlockEntity): Block | undefined {
    try {
      return Block.fromEntity(block)
    } catch (err) {
      console.debug(err)
    }
  }

  static fromBlock(block: Block, newType?: BlockType): Block {
    return new (getBlockConstructor(newType || block.getType()))(
      block.id,
      block.parentId,
      block.parentTable,
      block.storyId,
      block.content,
      block.alive,
      block.version,
      block.format,
      block.children,
      block.createdById,
      block.lastEditedById,
      block.createdAt,
      block.updatedAt,
    )
  }

  static fromArgs(args: unknown): Block {
    return new (getBlockConstructor(_.get(args, 'type')))(
      _.get(args, 'id'),
      _.get(args, 'parentId'),
      _.get(args, 'parentTable'),
      _.get(args, 'storyId'),
      _.get(args, 'content'),
      _.get(args, 'alive'),
      _.get(args, 'version'),
      _.get(args, 'format'),
      _.get(args, 'children'),
      _.get(args, 'createdById'),
      _.get(args, 'lastEditedById'),
      str2Date(_.get(args, 'createdAt')),
      str2Date(_.get(args, 'updatedAt')),
    )
  }

  abstract getType(): BlockType

  /**
   * prevent the occurrence of duplicated blocks
   * `id` for common block
   * `hash(title)` for story block
   */
  getInterKey(): string {
    return this.id
  }

  getParentType(): BlockParentType {
    return BlockParentType.BLOCK
  }

  getRecordedKeys(): string[] {
    return ['content', 'alive']
  }

  /**
   * inherits from story / thought block for common blocks
   */
  async getPermissions(
    getParentPermissions: () => Promise<PermissionModel[] | undefined>,
  ): Promise<PermissionModel[]> {
    return this.permissions ?? (await getParentPermissions()) ?? defaultPermissions
  }

  /**
   * set the value in the content by path, e.g. path = ["a", "b", "c"] => this.content.set("a.b.c", args)
   */
  setContentByPath(path: string[], args: unknown): void {
    setByPath(this, path, args, (a) => {
      const newBlock = Block.fromArgs(a)
      Object.assign(this, newBlock)
    })
  }

  /**
   * delete elements in the content that possessed the same id (by path)
   * NOTE: this.content.get(path) must be array or map, and its elements must have the field of `id`.
   */
  removeContentByPathAndId(path: string[], id: string): void {
    removeByPathAndId(this, path, id)
  }

  private async syncLink(manager: EntityManager, origin?: Block) {
    const needRemoves = origin ? getSubbedLinks(origin, this) : []
    const needAdds = getSubbedLinks(this, origin)

    if (!_(needRemoves).isEmpty()) {
      const deleteQuery = _(needRemoves)
        .map(({ sourceBlockId, targetBlockId }) =>
          _.omitBy({ sourceBlockId, targetBlockId }, _.isUndefined),
        )
        .value()

      await manager
        .getRepository(LinkEntity)
        .createQueryBuilder()
        .delete()
        .where(deleteQuery)
        .execute()
    }

    if (!_(needAdds).isEmpty()) {
      await manager.getRepository(LinkEntity).insert(needAdds)
    }
  }

  /**
   * sync the alive field of current block with its downstream blocks and corresponding links
   * if the `alive` field of a block were set to be false, all `alive` field of downstream blocks should also be set to false, and the alive status for links where source / target meet those blocks should also be updated
   * if the `alive` field of a block were set to be true (from false), all `alive` field of downstream blocks (here defined only by `children` field) should also be set to true, and the alive status for links where source / target meet those blocks should also be updated
   */
  protected async syncBlocksAlive(manager: EntityManager, origin?: Block): Promise<void> {
    // if `origin.children` does not exists, it is not a nested block
    if (!origin || !origin.children) {
      return
    }
    if (this.isBeingDeleted(origin)) {
      await Promise.all([
        this.updateChildrenAlive(manager, origin, false),
        updateSourceLinkAlive(manager, origin.id, false),
        updateTargetLinkAlive(manager, origin.id, false),
      ])
    }
    if (this.isBeingReverted(origin)) {
      await Promise.all([
        this.updateChildrenAlive(manager, origin, true),
        updateSourceLinkAlive(manager, origin.id, true),
        updateTargetLinkAlive(manager, origin.id, true),
      ])
    }
  }

  /**
   * update the `alive` field of all downstream blocks of a certain block
   */
  private async updateChildrenAlive(
    manager: EntityManager,
    origin: Block,
    alive: boolean,
  ): Promise<void> {
    if (_.isEmpty(origin.children)) {
      return
    }
    const updateClause = createQueryBuilder(BlockEntity, 'blocks').update().set({ alive })
    await cascadeUpdateBlocks(manager, origin.id, updateClause)
  }

  private isAliveEqual(target: boolean): boolean {
    return this.alive === target
  }

  protected isBeingDeleted(origin: { alive: boolean }): boolean {
    return origin.alive && this.isAliveEqual(false)
  }

  protected isBeingReverted(origin: { alive: boolean }): boolean {
    return !origin.alive && this.isAliveEqual(true)
  }

  protected isBeingCreated(origin?: Block): boolean {
    return !origin
  }
}

/**
 * returns [a.links - b.links]
 */
function getSubbedLinks(a: Block, b?: Block): LinkEntity[] {
  const als = a.getLinksFromContent ? a.getLinksFromContent() : []
  const bls = b?.getLinksFromContent ? b.getLinksFromContent() : []

  return _(als)
    .filter((l) => !_(bls).includes(l))
    .map((l) => {
      const entity = new LinkEntity()
      entity.sourceBlockId = a.id
      entity.targetBlockId = l.blockId
      entity.type = l.type
      return _.omitBy(entity, _.isUndefined) as LinkEntity
    })
    .value()
}

export function getPlainTextFromTokens(tokens: Token[]): string | undefined {
  try {
    return tokens
      .filter((t) => t[0] !== '‣')
      .map((t) => t[0])
      .join('')
    // eslint-disable-next-line
  } catch (err) {}
}

/**
 * recursively take all children blocks of the root block corresponding to rootBlockId, then apply update clause on it
 * Note: there must be a correct alias for updateClause
 * blockIdField denotes the field name corresponding to the blockId taking out (i.e. the field which joined with blockId)
 */
export async function cascadeUpdateBlocks<T extends TelleryBaseEntity>(
  manager: EntityManager,
  rootBlockId: string,
  updateClause: UpdateQueryBuilder<T>,
  blockIdField: keyof T = 'id',
): Promise<void> {
  const [updateSql, params] = updateClause
    .where(`${updateClause.alias}."${blockIdField}" in (SELECT id FROM result)`)
    .getQueryAndParameters()

  return manager.query(
    `WITH RECURSIVE result AS (
        SELECT id, children FROM blocks WHERE id = $${
          params.length + 1
        } UNION SELECT origin.id, origin.children FROM result JOIN blocks origin ON origin.id = ANY(result.children)
      )
      ${updateSql}`,
    [...params, rootBlockId],
  )
}

export async function cascadeLoadBlocksByLink(
  ids: string[],
  direction: 'forward' | 'backward',
  linkType: LinkType,
): Promise<BlockEntity[]> {
  let primaryBuilder
  let recursiveBuilder
  if (direction === 'backward') {
    primaryBuilder = createQueryBuilder(LinkEntity, 'links')
      .select('links."sourceBlockId"')
      .where('type = :linkType AND links."targetBlockId" IN (:...ids) AND "sourceAlive" = true', {
        ids,
        linkType,
      })
    recursiveBuilder = createQueryBuilder(LinkEntity, 'origin')
      .select('origin."sourceBlockId"')
      .innerJoin(
        'refLinks',
        'refLinks',
        'origin."targetBlockId" = "refLinks"."sourceBlockId" and origin."sourceAlive" = true and type = :linkType',
        { linkType },
      )
  } else {
    primaryBuilder = createQueryBuilder(LinkEntity, 'links')
      .select('links.targetBlockId')
      .where('type = :linkType AND links."sourceBlockId" IN (:...ids) AND "targetAlive" = true', {
        ids,
        linkType,
      })
    recursiveBuilder = createQueryBuilder(LinkEntity, 'origin')
      .select('origin.sourceBlockId')
      .innerJoin(
        'refLinks',
        'refLinks',
        'origin."targetBlockId" = "refLinks"."sourceBlockId" and origin."sourceAlive" = true and type = :linkType',
        { linkType },
      )
  }
  const [primarySql, primaryParams] = primaryBuilder.getQueryAndParameters()
  const [recursiveSql] = recursiveBuilder.getQueryAndParameters()

  const manager = getManager()
  return manager.query(
    `WITH RECURSIVE "refLinks" AS (
	   ${primarySql}
	   UNION
	   ${recursiveSql}
   )
   SELECT * from blocks join "refLinks" on blocks.id = "refLinks"."sourceBlockId"
   `,
    primaryParams,
  )
}
