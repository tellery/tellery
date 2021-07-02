import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'

import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { ThoughtService } from '../../src/services/thought'
import { dayBefore, mockThoughts } from '../testutils'

const thoughtService = new ThoughtService(new FakePermission())

test.before(async () => {
  await createDatabaseCon()
})

test('loadAllThoughts', async (t) => {
  const fstUser = nanoid()
  const sndUser = nanoid()

  const fstBlocks = await mockThoughts(10, fstUser, 'mockid')
  const sndBlocks = await mockThoughts(12, sndUser, 'mockid')
  const allIds = _(_.concat(fstBlocks, sndBlocks)).map('id').value()

  const fstRes = await thoughtService.loadAllThoughts('mockid', fstUser)
  const sndRes = await thoughtService.loadAllThoughts('mockid', sndUser)

  t.deepEqual(_(fstRes).map('id').value(), _(fstBlocks).map('id').value())
  t.deepEqual(_(fstRes).map('date').value(), _(10).range().map(dayBefore).value())
  t.deepEqual(_(sndRes).map('id').value(), _(sndBlocks).map('id').value())
  t.deepEqual(_(sndRes).map('date').value(), _(12).range().map(dayBefore).value())
  await getRepository(BlockEntity).delete(allIds)
})
