import { EntityManager } from 'typeorm'

import { Block, getPlainTextFromTokens } from '.'
import { WorkspaceViewEntity } from '../../entities/workspaceView'
import { BlockParentType, BlockType } from '../../types/block'
import { defaultPermissions, PermissionModel } from '../../types/permission'
import { md5 } from '../../utils/helper'
import { TextBlock } from './text'

export class StoryBlock extends TextBlock {
  static type = BlockType.STORY

  getType(): BlockType {
    return StoryBlock.type
  }

  getInterKey(): string {
    const title = getPlainTextFromTokens(this.getContent().title) ?? ''
    return md5(title)
  }

  getParentType(): BlockParentType {
    return BlockParentType.WORKSPACE
  }

  async postSave(manager: EntityManager, origin?: Block) {
    // 1. if the `alive` field of story were set to false, delete this story in workspaceView
    await this.cleanWorkspaceView(manager, origin)
    // 2. sync alive to to its children
    await this.syncBlocksAlive(manager, origin)
  }

  /**
   * @returns the default permission of story block is visible by workspace
   */
  async getPermissions(): Promise<PermissionModel[]> {
    return this.permissions ?? defaultPermissions
  }

  private async cleanWorkspaceView(manager: EntityManager, origin?: Block) {
    if (origin && this.isBeingDeleted(origin)) {
      await manager
        .createQueryBuilder()
        .update(WorkspaceViewEntity)
        .set({
          pinnedList: () => `array_remove( "pinnedList" , :id)`,
        })
        .where('workspaceId = :workspaceId AND :id = ANY(pinnedList)')
        .setParameters({ workspaceId: this.workspaceId, id: origin.id })
        .execute()
    }
  }
}
