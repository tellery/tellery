import bluebird from 'bluebird'
import { getRepository } from 'typeorm'

import {
  Activity,
  ActivityHandler,
  ActivityPayload,
  defaultExpireMs,
  getOrCreateLatestStoryActivityList,
} from '.'
import { ActivityEntity } from '../../entities/activity'
import { ActivityCommandType, ActivityResourceType } from '../../types/activity'
import { StoryBlock } from '../block/story'

export abstract class StoryActivity extends Activity {
  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    cmd: ActivityCommandType,
    timestamp: number,
  ) {
    super(id, workspaceId, operatorId, ActivityResourceType.STORY, cmd, timestamp)
  }

  static fromActivityModel(model: ActivityEntity): StoryActivity {
    if (model.cmd === ActivityCommandType.CREATED) {
      return new StoryCreatedActivity(
        model.resourceId,
        model.workspaceId,
        model.operatorId,
        model.after as StoryBlock,
        Number(model.timestamp),
      )
    }
    return new StoryUpdatedActivity(
      model.resourceId,
      model.workspaceId,
      model.operatorId,
      model.before as StoryBlock,
      model.after as StoryBlock,
      Number(model.timestamp),
    )
  }

  static fromActivityPayload(payload: ActivityPayload<StoryBlock>): StoryActivity {
    const { id, workspaceId, operatorId, before, after, timestamp } = payload
    if (!before) {
      return new StoryCreatedActivity(id, workspaceId, operatorId, after, timestamp)
    }
    return new StoryUpdatedActivity(id, workspaceId, operatorId, before!, after, timestamp)
  }
}

export class StoryCreatedActivity extends StoryActivity {
  after: StoryBlock

  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    after: StoryBlock,
    timestamp: number,
  ) {
    super(id, workspaceId, operatorId, ActivityCommandType.CREATED, timestamp)
    this.after = after
  }

  async save(activityListId: string): Promise<void> {
    const entity =
      (await getRepository(ActivityEntity).findOne({ activityListId, resourceId: this.id })) ||
      new ActivityEntity()
    entity.activityListId = activityListId
    entity.resourceId = this.id
    entity.workspaceId = this.workspaceId
    entity.resourceType = this.type
    entity.operatorId = this.operatorId
    entity.cmd = this.cmd
    entity.timestamp = BigInt(this.timestamp)
    entity.after = this.after
    await entity.save()
  }
}

export class StoryUpdatedActivity extends StoryActivity {
  before: StoryBlock

  after: StoryBlock

  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    before: StoryBlock,
    after: StoryBlock,
    timestamp: number,
  ) {
    super(
      id,
      workspaceId,
      operatorId,
      after.alive ? ActivityCommandType.UPDATED : ActivityCommandType.DELETED,
      timestamp,
    )
    this.before = before
    this.after = after
  }

  async save(activityListId: string): Promise<void> {
    const entity =
      (await getRepository(ActivityEntity).findOne({ activityListId, resourceId: this.id })) ||
      new ActivityEntity()
    entity.activityListId = activityListId
    entity.resourceId = this.id
    entity.workspaceId = this.workspaceId
    entity.resourceType = this.type
    entity.operatorId = this.operatorId
    entity.cmd = this.cmd
    entity.timestamp = BigInt(this.timestamp)
    entity.before = this.before
    entity.after = this.after
    await entity.save()
  }
}

export class StoryActivityHandler implements ActivityHandler<StoryBlock> {
  async save(payloads: ActivityPayload<StoryBlock>[]): Promise<void> {
    await bluebird.each(payloads, async (payload) => {
      const activity = StoryActivity.fromActivityPayload(payload)
      return getOrCreateLatestStoryActivityList(
        activity.workspaceId,
        activity.id,
        activity.cmd,
        activity.timestamp,
        activity.cmd === ActivityCommandType.UPDATED ? defaultExpireMs : 0,
      )
    })
    // TODO: save the record of story title modification
  }
}
