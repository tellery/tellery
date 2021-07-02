import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { ActivityEntity } from '../../src/entities/activity'
import { ActivityListEntity } from '../../src/entities/activityList'
import activitySyncService from '../../src/services/activitySync'
import { ActivityCommandType, ActivityResourceType } from '../../src/types/activity'

test.before(async () => {
  await createDatabaseCon()
})

test('test mergeAndSaveActivitiesPayloads With Block', async (t) => {
  const service = activitySyncService()
  const blockId = nanoid()
  await service.mergeAndSaveActivitiesPayloads([
    {
      // resource id
      id: blockId,
      // resource type
      table: ActivityResourceType.BLOCK,
      workspaceId: 'testWorkspace',
      operatorId: 'testUser',
      timestamp: _.now(),
      // resource after update
      after: { id: blockId, storyId: 'story', alive: true } as any,
    },
  ])

  const al = await getRepository(ActivityListEntity).findOne({ resourceId: 'story' })
  t.not(al, undefined)
  t.deepEqual(al?.resourceType, ActivityResourceType.STORY)
  const a = await getRepository(ActivityEntity).findOne({ activityListId: al?.id })
  t.not(a, undefined)
  t.deepEqual(a?.resourceId, blockId)

  await getRepository(ActivityListEntity).delete(al?.id!)
  await getRepository(ActivityListEntity).delete(a?.id!)
})

test('test mergeAndSaveActivitiesPayloads With Story', async (t) => {
  const service = activitySyncService()
  const storyId = nanoid()
  await service.mergeAndSaveActivitiesPayloads([
    {
      // resource id
      id: storyId,
      // resource type
      table: ActivityResourceType.STORY,
      workspaceId: 'testWorkspace',
      operatorId: 'testUser',
      timestamp: _.now(),
      // resource after update
      after: { id: storyId, children: [], alive: true } as any,
    },
    {
      // resource id
      id: storyId,
      // resource type
      table: ActivityResourceType.STORY,
      workspaceId: 'testWorkspace',
      operatorId: 'testUser',
      timestamp: _.now() + 2,
      before: { id: storyId, children: [], alive: true } as any,
      // resource after update
      after: { id: storyId, children: [], alive: true } as any,
    },
    {
      // resource id
      id: storyId,
      // resource type
      table: ActivityResourceType.STORY,
      workspaceId: 'testWorkspace',
      operatorId: 'testUser',
      timestamp: _.now() + 50000,
      before: { id: storyId, children: [], alive: true },
      // resource after update
      after: { id: storyId, children: [], alive: true },
    },
    {
      // resource id
      id: storyId,
      // resource type
      table: ActivityResourceType.STORY,
      workspaceId: 'testWorkspace',
      operatorId: 'testUser',
      timestamp: _.now() + 2,
      before: { id: storyId, children: [], alive: true },
      // resource after update
      after: { id: storyId, children: [], alive: false },
    },
  ])

  const al = await getRepository(ActivityListEntity).find({
    where: { resourceId: storyId },
    order: { startTimestamp: 'ASC' },
  })

  await getRepository(ActivityListEntity).delete(al[0].id)
  await getRepository(ActivityListEntity).delete(al[1].id)
  await getRepository(ActivityListEntity).delete(al[2].id)

  t.is(al.length, 3)
  t.deepEqual(al[0].resourceCmd, ActivityCommandType.CREATED)
  t.deepEqual(al[1].resourceCmd, ActivityCommandType.UPDATED)
  t.deepEqual(al[2].resourceCmd, ActivityCommandType.DELETED)
})
