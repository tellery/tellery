import bluebird from 'bluebird'
import { validate } from 'class-validator'
import { assert } from 'console'
import _ from 'lodash'

import { Block } from '.'
import BlockEntity from '../../entities/block'
import { InvalidArgumentError } from '../../error/error'
import { BlockParentType, BlockType } from '../../types/block'
import { PermissionModel } from '../../types/permission'
import { canUpdateBlockData } from '../../utils/permission'
import { DefaultOperation } from '../operation/operation'
import { IPermission } from '../permission'
import { TextBlock } from './text'

/**
 * for `set` and `update` operations, the calculation will be done in memory (query), and they will be saved after all operations done.
 * for operations of `remove` or `updateIndex`, if the operated field has been in the same query (children field in general), then operate it in query directly
 * (e.g. first set then remove, the data in memory must override the data in database. This approach performs better.)
 * if the field has not been in the query, it should be applied to database instead, to avoid collision of updateIndex by multi-user simultaneously.
 */
export class BlockOperation extends DefaultOperation {
  private readonly childrenPaths = ['children']

  async entity(id: string): Promise<Block> {
    const model = await this.manager.getRepository(BlockEntity).findOne(id)
    if (!model) {
      return new TextBlock(id, id, BlockParentType.BLOCK, id, {}, true, 0)
    }
    return Block.fromEntity(model)
  }

  async findInDB(id: string): Promise<Block | undefined> {
    const model = await this.manager.getRepository(BlockEntity).findOne(id)
    if (!model) {
      return
    }
    return Block.fromEntity(model)
  }

  async set(block: Block, args: any, path: string[]): Promise<Block> {
    if (_(path).isEmpty()) {
      return Block.fromArgs(args)
    }

    if (this.isUpdateType(path)) {
      return this.updateType(args, block)
    }

    block.setContentByPath(path, args)
    return block
  }

  async update(block: Block, args: any, path: string[]): Promise<Block> {
    if (this.isUpdateType(path)) {
      return this.updateType(args, block)
    }
    // args is map or object
    if (this.isObjOrMap(args)) {
      _.forEach(args, (val, key) => block.setContentByPath([...path, key], val))
    } else {
      block.setContentByPath(path, args)
    }

    return block
  }

  async setPermissions(block: Block, args: any, path: string[]): Promise<Block> {
    await this.validateArgsWhenSettingPermissions(block.getType(), args, path)

    await this.manager
      .getRepository(BlockEntity)
      .update({ storyId: block.id }, { permissions: args })

    block.setContentByPath(path, args)
    return block
  }

  async remove(block: Block, operateeId: string, path: string[]): Promise<Block> {
    this.validatePath(path)

    block.removeContentByPathAndId(path, operateeId)
    return block
  }

  async updateIndex(
    entity: Block,
    operateeId: string,
    path: string[],
    flag: 'before' | 'after',
    targetId?: string,
  ): Promise<Block> {
    this.validatePath(path)

    const res = await this.updateIndexHelper(entity, operateeId, path, flag, targetId)
    return res as Block
  }

  async save(entity: Block, origin?: Block): Promise<void> {
    await entity.preSave(this.manager)
    const model = entity.toModel(this.workspaceId)

    if (!origin) {
      await this.manager.getRepository(BlockEntity).insert(model)
    } else {
      await this.manager.getRepository(BlockEntity).update(model.id, model)
    }

    await entity.postSave(this.manager, origin)
  }

  // check the permission field of origin. if not exists, set its permission the same as newly created block
  async checkPermission(ipv: IPermission, entity: Block, origin?: Block): Promise<void> {
    const block = origin ?? entity
    block.createdById = block.createdById ?? this.operator

    const etm = block.toModel(this.workspaceId)
    etm.permissions = await block.getPermissions(async () =>
      this.manager
        .getRepository(BlockEntity)
        .findOne(block.storyId)
        .then((m) => m?.permissions),
    )
    return canUpdateBlockData(ipv, this.operator, this.workspaceId, etm)
  }

  private validatePath(path: string[]) {
    assert(_.isEqual(path, this.childrenPaths), 'the path of updating is invalid')
  }

  private async validateArgsWhenSettingPermissions(
    blockType: BlockType,
    args: any,
    path: string[],
  ) {
    assert(_.isEqual(path, ['permissions']), 'the path of setting permissions is invalid')
    assert(_.isEqual(blockType, BlockType.STORY), 'the type of block is invalid')
    // validate
    const errs = await bluebird.map(args, async (a: any) => {
      const model = new PermissionModel()
      model.id = _(a).get('id')
      model.role = _(a).get('role')
      model.type = _(a).get('type')

      return validate(model)
    })
    const errors = _(errs).flatMap().value()
    if (errors.length) {
      throw InvalidArgumentError.new(errors.toString())
    }
  }

  private isUpdateType(path: string[]) {
    return path[0] === 'type'
  }

  private updateType(newType: BlockType, block: Block): Block {
    return Block.fromBlock(block, newType)
  }
}
