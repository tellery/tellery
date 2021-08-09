import bluebird from 'bluebird'
import _ from 'lodash'
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
import { Block } from '../block'

export abstract class BlockActivity extends Activity {
  storyId: string

  after: Block

  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    storyId: string,
    cmd: ActivityCommandType,
    timestamp: number,
    after: Block,
  ) {
    super(id, workspaceId, operatorId, ActivityResourceType.BLOCK, cmd, timestamp)
    this.storyId = storyId
    this.after = after
  }

  static fromActivityModel(model: ActivityEntity): BlockActivity {
    if (model.cmd === ActivityCommandType.CREATED) {
      return new BlockCreatedActivity(
        model.resourceId,
        model.workspaceId,
        model.operatorId,
        _(model.after as Record<string, unknown>).get('storyId') as string,
        model.after as Block,
        Number(model.timestamp),
      )
    }
    return new BlockUpdatedActivity(
      model.resourceId,
      model.workspaceId,
      model.operatorId,
      _(model.after as Record<string, unknown>).get('storyId') as string,
      model.before as Block,
      model.after as Block,
      Number(model.timestamp),
    )
  }

  static fromActivityPayload(payload: ActivityPayload<Block>): BlockActivity {
    const { id, workspaceId, operatorId, before, after, timestamp } = payload
    if (!before) {
      return new BlockCreatedActivity(id, workspaceId, operatorId, after.storyId, after, timestamp)
    }
    return new BlockUpdatedActivity(
      id,
      workspaceId,
      operatorId,
      after.storyId,
      before!,
      after,
      timestamp,
    )
  }
}

/**
 * the activity of block being deleted or being modified
 */
export class BlockUpdatedActivity extends BlockActivity {
  before: Block

  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    storyId: string,
    before: Block,
    after: Block,
    timestamp: number,
  ) {
    super(
      id,
      workspaceId,
      operatorId,
      storyId,
      after.alive ? ActivityCommandType.UPDATED : ActivityCommandType.DELETED,
      timestamp,
      after,
    )
    this.before = before
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

/**
 * the activity of block being created
 */
export class BlockCreatedActivity extends BlockActivity {
  constructor(
    id: string,
    workspaceId: string,
    operatorId: string,
    storyId: string,
    after: Block,
    timestamp: number,
  ) {
    super(id, workspaceId, operatorId, storyId, ActivityCommandType.CREATED, timestamp, after)
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

export class BlockActivityHandler implements ActivityHandler<Block> {
  cache: { [k: string]: { activityId: string; startTimestamp: number }[] } = {} // key: storyId

  activitiesCache: { [k: string]: Activity[] } = {} // key: activityId

  async save(payloads: ActivityPayload<Block>[]): Promise<void> {
    await bluebird.each(payloads, async (payload) => {
      const activity = BlockActivity.fromActivityPayload(payload)
      // 1. get latest activity model of story
      const model =
        this.getFromCache(activity.storyId, activity.timestamp) ||
        (await getOrCreateLatestStoryActivityList(
          activity.workspaceId,
          activity.storyId,
          ActivityCommandType.UPDATED,
          activity.timestamp,
          defaultExpireMs,
        ))
      const cachedActs = this.getFromActivityCache(model.activityId)

      // 2. merge payload into `edits` of activity
      this.merge(cachedActs, activity)
      this.setToCache(activity.storyId, model)
      this.setToActivityCache(model.activityId, cachedActs)
    })

    const changedResourceIds = _(payloads).map('id').value()

    // save all activities
    await bluebird.map(
      _(this.cache).values().flatMap().map('activityId').value(),
      (activityListId) =>
        bluebird.map(
          _(this.activitiesCache[activityListId])
            .filter((a) => changedResourceIds.includes(a.id))
            .value(),
          (act) => act.save(activityListId),
        ),
    )
  }

  merge(edits: Activity[], activity: BlockActivity): void {
    const blockActivity = _(edits).find(
      (b) => b.id === activity.id && b.operatorId === activity.operatorId,
    ) as BlockActivity | undefined

    // create
    if (!blockActivity) {
      edits.push(activity)
      return
    }

    // update: replace the `after` field of blockActivity by activity got merged
    if (activity.cmd === ActivityCommandType.UPDATED) {
      // if the operation before is deletion, then the `after` field before deletion should be assigned to the `before` field.
      if (blockActivity.cmd === ActivityCommandType.DELETED) {
        ;(blockActivity as BlockUpdatedActivity).before = blockActivity.after
      }
      blockActivity.cmd = activity.cmd
      blockActivity.after = activity.after
      return
    }

    // delete => just replace blockActivity
    _.assign(blockActivity, activity)
  }

  private getFromCache(storyId: string, startTimestamp: number) {
    const models = this.cache[storyId]
    return _(models).find((m) => m.startTimestamp + defaultExpireMs >= startTimestamp)
  }

  private getFromActivityCache(activityId: string): Activity[] {
    return this.activitiesCache[activityId] || []
  }

  private setToCache(storyId: string, val: { activityId: string; startTimestamp: number }) {
    if (_.isEmpty(this.cache[storyId])) {
      this.cache[storyId] = [val]
      return
    }
    const origin = _(this.cache[storyId]).find((m) => m.startTimestamp === val.startTimestamp)
    if (origin) {
      _.assign(origin, val)
    } else {
      this.cache[storyId].push(val)
    }
  }

  private setToActivityCache(activityId: string, activities: Activity[]) {
    this.activitiesCache[activityId] = activities
  }
}
