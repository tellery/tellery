import _ from 'lodash'
import { getRepository } from 'typeorm'

import { Block } from '../core/block'
import { ThoughtBlock } from '../core/block/thought'
import { getIPermission, IPermission } from '../core/permission'
import BlockEntity from '../entities/block'
import { canGetWorkspaceData } from '../utils/permission'

export class ThoughtService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  async loadAllThoughts(
    workspaceId: string,
    operatorId: string,
  ): Promise<{ id: string; date: string }[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const blocks = await getRepository(BlockEntity).find({
      type: ThoughtBlock.type,
      parentId: workspaceId,
      createdById: operatorId,
      alive: true,
    })

    return _(blocks)
      .map((m) => Block.fromEntity(m) as ThoughtBlock)
      .sort((a, b) => (a.getDate() > b.getDate() ? -1 : 1))
      .map((m) => ({ id: m.storyId, date: m.getDate() }))
      .value()
  }
}

const service = new ThoughtService(getIPermission())

export default service
