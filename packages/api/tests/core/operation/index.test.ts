import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection } from 'typeorm'
import { createDatabaseCon } from '../../../src/clients/db/orm'
import { ActivityPayload } from '../../../src/core/activity'
import { Block } from '../../../src/core/block'
import { TextBlock } from '../../../src/core/block/text'
import { OperationManager } from '../../../src/core/operation'
import { IOperationEntity } from '../../../src/core/operation/operation'
import { FakePermission } from '../../../src/core/permission'
import service from '../../../src/services/activitySync'
import { ActivityResourceType } from '../../../src/types/activity'
import { BlockParentType } from '../../../src/types/block'
import { OperationTableType } from '../../../src/types/operation'

test.before(async () => {
  await createDatabaseCon()
})

test('test record', async (t) => {
  const id = nanoid()
  const workspaceId = nanoid()
  return getConnection().transaction(async (manager) => {
    const queueKey = `queue:activity:${workspaceId}`
    const activityService = service()
    const so = new OperationManager(
      id,
      workspaceId,
      'test',
      OperationTableType.BLOCK,
      manager,
      new FakePermission(),
      activityService,
    )

    // test block
    const blockId = nanoid()
    const beforeBlock = new TextBlock(
      blockId,
      'xxx',
      BlockParentType.BLOCK,
      workspaceId,
      { key: 'newKey' },
      true,
      0,
    )
    const afterBlock = new TextBlock(
      blockId,
      'xxx',
      BlockParentType.BLOCK,
      workspaceId,
      { key: 'key' },
      true,
      0,
    )
    await so.recordActivity(beforeBlock, afterBlock)
    let res: ActivityPayload<IOperationEntity>[] = []
    await activityService.queue.pollAll(queueKey, async (payloads) => {
      res = payloads
    })

    res = _(res)
      .map((r) => ({
        ...r,
        before: _.pickBy(r.before, _.identity),
        after: _.pickBy(r.after, _.identity),
      }))
      .value() as ActivityPayload<Block>[]

    t.deepEqual(res, [
      {
        id,
        table: ActivityResourceType.BLOCK,
        workspaceId,
        operatorId: 'test',
        timestamp: res[0].timestamp,
        before: _.pickBy(beforeBlock, _.identity) as Block,
        after: _.pickBy(afterBlock, _.identity) as Block,
      },
    ])
  })
})
