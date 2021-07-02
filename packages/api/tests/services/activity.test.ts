import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { ActivityEntity } from '../../src/entities/activity'
import { ActivityListEntity } from '../../src/entities/activityList'
import activityService from '../../src/services/activity'
import { ActivityCommandType, ActivityResourceType } from '../../src/types/activity'
import { uuid } from '../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('list activities', async (t) => {
  const wid = nanoid()

  const entity = new ActivityListEntity()
  entity.workspaceId = wid
  entity.resourceId = nanoid()
  entity.resourceType = ActivityResourceType.STORY
  entity.resourceCmd = ActivityCommandType.UPDATED
  entity.startTimestamp = BigInt(_.now())
  const al = await getRepository(ActivityListEntity).save(entity)
  const uid = uuid()

  const insert1 = new ActivityEntity()
  insert1.activityListId = al.id
  insert1.resourceId = nanoid()
  insert1.workspaceId = wid
  insert1.resourceType = ActivityResourceType.BLOCK
  insert1.operatorId = uid
  insert1.cmd = ActivityCommandType.UPDATED
  insert1.timestamp = BigInt(_.now())
  insert1.after = { storyId: nanoid(), alive: false }
  const insert2 = new ActivityEntity()
  insert2.activityListId = al.id
  insert2.resourceId = nanoid()
  insert2.workspaceId = wid
  insert2.resourceType = ActivityResourceType.BLOCK
  insert2.operatorId = uid
  insert2.cmd = ActivityCommandType.UPDATED
  insert2.timestamp = BigInt(_.now())
  insert2.after = { storyId: nanoid(), alive: false }
  await getRepository(ActivityEntity).insert([insert1, insert2])

  const list = await activityService.list(uid, wid)

  t.is(list.activities.length, 1)
  t.is(list.activities[0].edits.length, 2)
})
