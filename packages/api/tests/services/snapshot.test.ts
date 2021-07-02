import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakePermission } from '../../src/core/permission'
import { SnapshotEntity } from '../../src/entities/snapshot'
import { SnapshotService } from '../../src/services/snapshot'

const snapshotService = new SnapshotService(new FakePermission())

const idLen = 50
const qid = 'qid'
const ids = _.range(idLen).map(() => nanoid())
const data = {
  fields: [
    { name: 'id', sqlType: 'bigint', displayType: 'number' },
    { name: 'gender', sqlType: 'int', displayType: 'number' },
    { name: 'age', sqlType: 'string', displayType: 'string' },
    { name: 'level', sqlType: 'int', displayType: 'number' },
    { name: 'last_nickname', sqlType: 'string', displayType: 'string' },
    { name: 'comment_nickname', sqlType: 'string', displayType: 'string' },
    { name: 'remark', sqlType: 'string', displayType: 'string' },
    { name: 'last_remark_admin', sqlType: 'string', displayType: 'string' },
    { name: 'create_time', sqlType: 'timestamp', displayType: 'number' },
    { name: 'qq_open_id', sqlType: 'string', displayType: 'string' },
    { name: 'wx_open_id', sqlType: 'string', displayType: 'string' },
    { name: 'wx_union_id', sqlType: 'string', displayType: 'string' },
    { name: 'phone', sqlType: 'string', displayType: 'string' },
    { name: 'password', sqlType: 'string', displayType: 'string' },
    { name: 'filter_words', sqlType: 'string', displayType: 'string' },
    { name: 'index_tab', sqlType: 'int', displayType: 'number' },
    { name: 'push_sound', sqlType: 'int', displayType: 'number' },
    { name: 'is_spam_audit', sqlType: 'int', displayType: 'number' },
    { name: 'is_mute_audit', sqlType: 'int', displayType: 'number' },
    { name: 'birthday', sqlType: 'date', displayType: 'date' },
    { name: 'distinct_id', sqlType: 'string', displayType: 'string' },
  ],
  truncated: true,
  records: [
    [
      21244,
      2,
      '95+',
      1,
      '一只椒',
      '祝福你呀',
      null,
      null,
      '2018-05-17T22:38:36.000Z',
      null,
      'ocIz_1HXIyHlNXj6wUkzItNvfVxg',
      'oK1uow9dTWaw9oD2m0taVeNeTMp0',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'MzxjqNby2zRPyr06gKnO',
    ],
  ],
}

test.before(async () => {
  await createDatabaseCon()
  const docs = _.map(ids, (id) => {
    const entity = new SnapshotEntity()
    entity.id = id
    entity.questionId = qid
    entity.data = data
    entity.sql = 'test'
    entity.alive = true
    return entity
  })

  await getRepository(SnapshotEntity).save(docs)
})

test.after.always(async () => {
  await getRepository(SnapshotEntity).delete(ids)
})

test('mgetSnapshots', async (t) => {
  const snaps1 = await snapshotService.mget('test', 'test', ids)
  t.is(snaps1.length, idLen)

  const snaps2 = await snapshotService.mget('test', 'test', _.slice(ids, 0, 2))
  t.is(snaps2.length, 2)
})
