import '../../../src/core/block/init'

import test from 'ava'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { PgHistoryStore } from '../../../src/core/history/database'
import StoryHistoryEntity from '../../../src/entities/history'
import { uuid } from '../../testutils'

const store = new PgHistoryStore()

test.before(async () => {
  await createDatabaseCon()
})

test('loadStoryHistoryVersions', async (t) => {
  const { id } = await getRepository(StoryHistoryEntity)
    .create({
      workspaceId: 'test',
      storyId: 'test',
      contents: { blocks: [], links: [] },
      createdById: uuid(),
    })
    .save()

  const res = await store.loadStoryHistoryVersions('test', 'test')
  t.not(res.length, 0)
  await getRepository(StoryHistoryEntity).delete(id)
})
