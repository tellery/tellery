import _ from 'lodash'
import { getRepository, MoreThanOrEqual } from 'typeorm'
import { ActivityListEntity } from '../../entities/activityList'

import { ActivityCommandType, ActivityEditDTO, ActivityResourceType } from '../../types/activity'

export const defaultExpireMs = 3600000

export interface ActivityPayload<T> {
  // resource id
  id: string
  // resource type
  table: ActivityResourceType
  workspaceId: string
  operatorId: string
  timestamp: number
  // value before modification
  before?: T
  // value after modification
  after: T
}

/**
 * this interface denotes if a type of resource can be recorded
 */
export interface Recordable<T> {
  needRecord(newT: T): boolean
}

export interface ActivityHandler<T> {
  save(payloads: ActivityPayload<T>[]): Promise<void>
}

export class BaseActivityHandler {}

export abstract class Activity {
  // resource type
  type: ActivityResourceType

  // resource id
  id: string

  workspaceId: string

  operatorId: string

  cmd: ActivityCommandType

  timestamp: number

  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    table: ActivityResourceType,
    cmd: ActivityCommandType,
    timestamp: number,
  ) {
    this.id = id
    this.workspaceId = workspaceId
    this.operatorId = operatorId
    this.type = table
    this.cmd = cmd
    this.timestamp = timestamp
  }

  toDTO(): ActivityEditDTO {
    const before = _(this).get('before')
    const after = _(this).get('after')
    return {
      resourceId: this.id,
      workspaceId: this.workspaceId,
      resourceType: this.type,
      operatorId: this.operatorId,
      cmd: this.cmd,
      type: this.getType(),
      timestamp: this.timestamp,
      before: before?.toDTO ? before?.toDTO() : before,
      after: after?.toDTO ? after?.toDTO() : after,
    }
  }

  /**
   * get the type of resource change
   */
  getType(): string {
    return `${this.type}-${this.cmd}`
  }

  abstract save(activityListId: string): Promise<void>
}

// get latest story activities within 1 hr
export async function getOrCreateLatestStoryActivityList(
  workspaceId: string,
  storyId: string,
  cmd: ActivityCommandType,
  sts = _.now(),
  expire = 3600000,
): Promise<{ activityId: string; startTimestamp: number }> {
  const findList = await getRepository(ActivityListEntity).find({
    where: {
      workspaceId,
      resourceId: storyId,
      resourceType: ActivityResourceType.STORY,
      resourceCmd: cmd,
      startTimestamp: MoreThanOrEqual(sts - expire),
    },
    order: {
      startTimestamp: 'DESC',
    },
    take: 1,
  })

  const latest = findList[0]

  if (latest) {
    return { activityId: latest.id, startTimestamp: Number(latest.startTimestamp) }
  }
  const { id, startTimestamp } = await getRepository(ActivityListEntity).save({
    workspaceId,
    resourceId: storyId,
    resourceType: ActivityResourceType.STORY,
    resourceCmd: cmd,
    startTimestamp: BigInt(sts),
  })
  return { activityId: id, startTimestamp: Number(startTimestamp) }
}
