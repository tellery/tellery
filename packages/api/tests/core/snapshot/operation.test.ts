import test from 'ava'
import { nanoid } from 'nanoid'
import { getConnection } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { SnapshotOperation } from '../../../src/core/snapshot/operation'
import { SnapshotEntity } from '../../../src/entities/snapshot'
import { set, update, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('setSnapshot', async (t) => {
  return getConnection().transaction(async (manager) => {
    const op = new SnapshotOperation(uuid(), 'test', manager)
    const id = nanoid()

    await set(
      op,
      id,
      {
        id,
        questionId: nanoid(),
        data: {
          fields: [],
          records: [],
          truncated: false,
        },
        sql: 'select',
        alive: true,
      },
      [],
    )

    const snapshot1 = await manager.getRepository(SnapshotEntity).findOne(id)
    t.not(snapshot1, undefined)
    t.deepEqual(snapshot1?.data, {
      fields: [],
      records: [],
      truncated: false,
    })
    t.deepEqual(snapshot1?.sql, 'select')
    t.is(snapshot1?.alive, true)
    t.deepEqual(snapshot1?.version, 1)

    await set(
      op,
      id,
      {
        fields: [{ name: 'a', sqlType: 'a', displayType: 'a' }],
        records: [['a']],
        truncated: true,
      },
      ['data'],
    )

    const snapshot2 = await manager.getRepository(SnapshotEntity).findOne(id)
    t.not(snapshot2, undefined)
    t.deepEqual(snapshot2?.data, {
      fields: [{ name: 'a', sqlType: 'a', displayType: 'a' }],
      records: [['a']],
      truncated: true,
    })
    t.deepEqual(snapshot2?.version, 2)

    await manager.getRepository(SnapshotEntity).delete(id)
  })
})

test('updateSnapshot', async (t) => {
  return getConnection().transaction(async (manager) => {
    const op = new SnapshotOperation(uuid(), 'test', manager)
    const id = nanoid()
    const uid = uuid()

    // create
    await set(
      op,
      id,
      {
        id,
        questionId: nanoid(),
        data: {
          fields: [],
          records: [],
          truncated: false,
        },
        sql: 'select',
        alive: true,
        createdById: uid,
      },
      [],
    )

    await update(
      op,
      id,
      {
        fields: [],
        records: [],
        truncated: true,
      },
      ['data'],
    )

    const snapshot1 = await manager.getRepository(SnapshotEntity).findOne(id)

    t.not(snapshot1, undefined)
    t.deepEqual(snapshot1?.data, {
      fields: [],
      records: [],
      truncated: true,
    })
    t.is(snapshot1?.alive, true)
    t.deepEqual(snapshot1?.version, 2)
    t.deepEqual(snapshot1?.createdById, uid)

    await update(
      op,
      id,
      [{ name: 'test', displayType: 'test', sqlType: 'test' }],
      ['data', 'fields'],
    )

    const snapshot2 = await manager.getRepository(SnapshotEntity).findOne(id)
    t.not(snapshot2, undefined)
    t.deepEqual(snapshot2?.data, {
      fields: [{ name: 'test', displayType: 'test', sqlType: 'test' }],
      records: [],
      truncated: true,
    })
    t.is(snapshot2?.alive, true)
    t.deepEqual(snapshot2?.version, 3)
    t.deepEqual(snapshot2?.createdById, uid)

    await manager.getRepository(SnapshotEntity).delete(id)
  })
})
