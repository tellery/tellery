import test, { ExecutionContext } from 'ava'
import { now } from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository, In } from 'typeorm'
import { createDatabaseCon } from '../../../src/clients/db/orm'

import {
  BlockActivity,
  BlockActivityHandler,
  BlockCreatedActivity,
  BlockUpdatedActivity,
} from '../../../src/core/activity/block'
import { Block } from '../../../src/core/block'
import { ActivityEntity } from '../../../src/entities/activity'
import { ActivityListEntity } from '../../../src/entities/activityList'
import { ActivityResourceType } from '../../../src/types/activity'

function compare(t: ExecutionContext, a: any, b: any) {
  t.deepEqual(JSON.stringify(a), JSON.stringify(b))
}

test.before(async () => {
  await createDatabaseCon()
})

test('test merging block activity', async (t) => {
  const handler = new BlockActivityHandler()
  const bid = nanoid()
  const wid = 'test'
  const oid = 'test'
  const sid = nanoid()

  const created = new BlockCreatedActivity( // create
    bid,
    wid,
    oid,
    sid,
    { id: bid, content: 'before', alive: true } as any as Block,
    0,
  )
  const updated = new BlockUpdatedActivity( // edit
    bid,
    wid,
    oid,
    sid,
    { id: bid, content: 'before', alive: true } as any as Block,
    { id: bid, content: 'after', alive: true } as any as Block,
    0,
  )

  const deleted = new BlockUpdatedActivity( // delete
    bid,
    wid,
    oid,
    sid,
    { id: bid, content: 'after', alive: true } as any as Block,
    { id: bid, content: 'after', alive: false } as any as Block,
    0,
  )

  const activities: BlockActivity[] = []

  // 1. create
  handler.merge(activities, created)
  t.deepEqual(activities, [created])

  // 2. update
  handler.merge(activities, updated)
  // same value but different type
  compare(t, activities, [
    new BlockUpdatedActivity( // edit
      bid,
      wid,
      oid,
      sid,
      // no before
      undefined as any,
      updated.after,
      0,
    ),
  ])

  // 3. delete
  handler.merge(activities, deleted)
  compare(t, activities, [deleted])

  // 4. rollback
  handler.merge(activities, updated)
  compare(t, activities, [
    new BlockUpdatedActivity( // edit
      bid,
      wid,
      oid,
      sid,
      // no before
      deleted.after,
      updated.after,
      0,
    ),
  ])
})

test('save block activities', async (t) => {
  const handler = new BlockActivityHandler()
  const bid1 = nanoid()
  const bid2 = nanoid()
  const sid = nanoid()
  const timestamp = now() - 10000000
  const nowTimestamp = now()
  // handler.save()
  await handler.save([
    {
      id: bid1,
      table: ActivityResourceType.BLOCK,
      workspaceId: 'test',
      operatorId: 'testUser',
      timestamp,
      // resource after update
      after: { id: bid1, storyId: sid, content: 'before', alive: true } as any as Block,
    },
    {
      id: bid1,
      table: ActivityResourceType.BLOCK,
      workspaceId: 'test',
      operatorId: 'testUser',
      timestamp: timestamp + 5000,
      before: { id: bid1, storyId: sid, content: 'before', alive: true } as any as Block,
      // resource after update
      after: { id: bid1, storyId: sid, content: 'after', alive: true } as any as Block,
    },
    {
      id: bid2,
      table: ActivityResourceType.BLOCK,
      workspaceId: 'test',
      operatorId: 'testUser',
      timestamp: timestamp + 10000,
      // resource after update
      after: { id: bid2, storyId: sid, content: 'before', alive: true } as any as Block,
    },
    {
      id: bid2,
      table: ActivityResourceType.BLOCK,
      workspaceId: 'test',
      operatorId: 'testUser',
      timestamp: nowTimestamp,
      before: { id: bid2, storyId: sid, content: 'before', alive: true } as any as Block,
      // resource after update
      after: { id: bid2, storyId: sid, content: 'before', alive: false } as any as Block,
    },
  ])

  const als = await getRepository(ActivityListEntity).find({ resourceId: sid })
  t.is(als.length, 2)

  const as = await getRepository(ActivityEntity).find({
    where: { resourceId: In([bid1, bid2]) },
    order: { timestamp: 'ASC' },
  })
  t.is(as.length, 3)

  const as0 = as[0]
  t.deepEqual(as0.activityListId, als[0].id)
  t.deepEqual(as0.cmd, 'updated')
  t.deepEqual(as0.before, null)
  t.deepEqual(as0.after, {
    id: bid1,
    storyId: sid,
    content: 'after',
    alive: true,
  })

  const as1 = as[1]
  t.deepEqual(as1.activityListId, als[0].id)
  t.deepEqual(as1.cmd, 'created')
  t.deepEqual(as1.before, null)
  t.deepEqual(as1.after, {
    id: bid2,
    storyId: sid,
    content: 'before',
    alive: true,
  })

  const as2 = as[2]
  t.deepEqual(as2.activityListId, als[1].id)
  t.deepEqual(as2.cmd, 'deleted')
  t.deepEqual(as2.before, {
    id: bid2,
    storyId: sid,
    content: 'before',
    alive: true,
  })
  t.deepEqual(as2.after, {
    id: bid2,
    storyId: sid,
    content: 'before',
    alive: false,
  })

  await getRepository(ActivityListEntity).delete(als.map((r) => r.id))
  await getRepository(ActivityEntity).delete(as.map((r) => r.id))
})
