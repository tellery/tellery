import config from 'config'
import _ from 'lodash'

import { getRedisCon } from '../clients/db/redis'
import { ActivityPayload } from '../core/activity'
import { BlockActivityHandler } from '../core/activity/block'
import { StoryActivityHandler } from '../core/activity/story'
import { Block } from '../core/block'
import { StoryBlock } from '../core/block/story'
import { IOperationEntity } from '../core/operation/operation'
import { PgQueue, Queue, RedisQueue } from '../store/queue'
import { ActivityResourceType } from '../types/activity'
import { BlockType } from '../types/block'
import { OperationTableType } from '../types/operation'

type Payload = ActivityPayload<IOperationEntity>

export class ActivitySyncService {
  queue: Queue<Payload>

  static pathListNeedsToBeRecord = ['content', 'title']

  constructor(queue: Queue<Payload>) {
    this.queue = queue
  }

  makeActivityPayload(
    id: string,
    workspaceId: string,
    operatorId: string,
    table: OperationTableType,
    after: IOperationEntity,
    before?: IOperationEntity,
  ): Payload {
    let art = (table as any) as ActivityResourceType
    // distinguish block and story
    if (art === ActivityResourceType.BLOCK && (after as Block).getType() === BlockType.STORY) {
      art = ActivityResourceType.STORY
    }
    return {
      id,
      table: art,
      workspaceId,
      operatorId,
      timestamp: _.now(),
      before,
      after,
    }
  }

  async syncWorkspaceActivities(workspaceId: string): Promise<void> {
    return this.queue.pollAll(this.getQueueKey(workspaceId), async (payloads) =>
      this.mergeAndSaveActivitiesPayloads(payloads),
    )
  }

  /**
   * visible for testing
   * merge payloads in buffer
   * @param payloads
   */
  // TODO: add transactions
  async mergeAndSaveActivitiesPayloads(payloads: Payload[]): Promise<void> {
    // handle block activity
    const blockPays = _(payloads)
      .filter((p) => p.table === ActivityResourceType.BLOCK)
      .value() as ActivityPayload<Block>[]
    // handle story activity
    const storyPays = _(payloads)
      .filter((p) => p.table === ActivityResourceType.STORY)
      .value() as ActivityPayload<StoryBlock>[]
    await new StoryActivityHandler().save(storyPays)
    await new BlockActivityHandler().save(blockPays)
  }

  /**
   * save data into buffer
   */
  async sendToBuffer(workspaceId: string, activities: Payload[]): Promise<void> {
    const activity = _(activities).first()
    if (activity) {
      return this.queue.addAll(this.getQueueKey(workspaceId), activities)
    }
  }

  private getQueueKey(workspaceId: string): string {
    return `queue:activity:${workspaceId}`
  }
}

function service() {
  return new ActivitySyncService(
    config.has('redis.url') ? new RedisQueue(getRedisCon()) : new PgQueue(),
  )
}

export default service
