import bluebird from 'bluebird'
import _ from 'lodash'
import { getRepository, In } from 'typeorm'

import { Block } from '../core/block'
import { LinkWithStoryId, loadLinkEntitiesByBlockIds } from '../core/link'
import { getIPermission, IPermission } from '../core/permission'
import BlockEntity from '../entities/block'
import { BlockDTO, BlockParentType } from '../types/block'
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

    const blocks = await this.listEntitiesByStoryId(storyId)

    return _(blocks)
      .map((b) => Block.fromEntity(b))
      .map((b) => {
        if (!b.alive) {
          this.overrideContent(b)
        }
        return b
      })
      .filter(
        (b1) =>
          b1.parentTable === BlockParentType.WORKSPACE ||
          (_(blocks).find((b2) => b1.parentId === b2.id)?.children || []).includes(b1.id),
      )
      .value()
  }

  async mget(operatorId: string, workspaceId: string, ids: string[]): Promise<BlockDTO[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const models = await getRepository(BlockEntity).find({ id: In(ids) })

    const dtos = await bluebird.map(models, async (model) => {
      const can = await this.permission.canGetBlockData(operatorId, model)
      const dto = Block.fromModelSafely(model)?.toDTO()
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
}

const service = new BlockService(getIPermission())
export default service
