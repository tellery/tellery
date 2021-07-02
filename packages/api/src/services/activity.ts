import _ from 'lodash'
import { getRepository, In } from 'typeorm'

import { Activity } from '../core/activity'
import { BlockActivity } from '../core/activity/block'
import { StoryActivity } from '../core/activity/story'
import { getIPermission, IPermission } from '../core/permission'
import { ActivityEntity } from '../entities/activity'
import { ActivityListEntity } from '../entities/activityList'
import { ActivityDTO, ActivityEditDTO, ActivityResourceType } from '../types/activity'
import { SkipLoadMoreKey } from '../types/common'
import { skipLoadMore } from '../utils/loadMore'
import { canGetWorkspaceData } from '../utils/permission'

export class ActivityService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  async list(
    operatorId: string,
    workspaceId: string,
    next?: SkipLoadMoreKey,
  ): Promise<{ activities: ActivityDTO[]; next?: SkipLoadMoreKey }> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const loadMoreKey = next || { skip: 0, limit: 20 }
    const { limit = 20, skip } = loadMoreKey
    const models = await getRepository(ActivityListEntity).find({
      where: { workspaceId },
      order: {
        startTimestamp: 'DESC',
      },
      skip,
      take: limit,
    })
    const { data: activityLists, next: nextNext } = skipLoadMore(models, limit, skip)

    const editsMap = await this.mgetActivitiesByActivityListId(_(activityLists).map('id').value())

    const activities = _(activityLists)
      .map((al) => ({
        id: al.id,
        workspaceId: al.workspaceId,
        resourceId: al.resourceId,
        resourceType: al.resourceType,
        resourceCmd: al.resourceCmd,
        edits: editsMap[al.id],
        startTimestamp: Number(al.startTimestamp),
      }))
      .value()

    return {
      activities,
      next: nextNext,
    }
  }

  private async mgetActivitiesByActivityListId(
    activityListIds: string[],
  ): Promise<{ [k: string]: ActivityEditDTO[] }> {
    const models = await getRepository(ActivityEntity).find({
      where: { activityListId: In(activityListIds) },
      order: { timestamp: 'ASC' },
    })
    return _(models)
      .map((model) => {
        const value = fromEntity(model)?.toDTO()
        return value ? { activityListId: model.activityListId, ...value } : undefined
      })
      .compact()
      .groupBy('activityListId')
      .value()
  }
}

function fromEntity(model: ActivityEntity): Activity | undefined {
  switch (model.resourceType) {
    case ActivityResourceType.BLOCK:
      return BlockActivity.fromActivityModel(model)
    case ActivityResourceType.STORY:
      return StoryActivity.fromActivityModel(model)
  }
}

const service = new ActivityService(getIPermission())
export default service
