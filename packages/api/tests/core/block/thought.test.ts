import '../../../src/core/block/init'

import test from 'ava'
import { nanoid } from 'nanoid'
import { getConnection } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { BlockOperation } from '../../../src/core/block/operation'
import BlockEntity from '../../../src/entities/block'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { set, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('setThought', async (t) =>
  getConnection().transaction(async (manager) => {
    const uid = uuid()
    const op = new BlockOperation(uid, 'test', manager)
    const id = nanoid()

    await set(
      op,
      id,
      {
        id,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        type: BlockType.THOUGHT,
        storyId: id,
        content: { date: '2021-03-12' },
        children: [],
        alive: true,
        createdById: uid,
      },
      [],
    )

    const thought1 = await manager.getRepository(BlockEntity).findOne(id)

    t.not(thought1, undefined, 'thought1 should not be null')
    t.deepEqual(thought1?.children, [], 'thought1 content is incorrect')
    t.deepEqual(thought1?.parentId, 'test')
    t.deepEqual(thought1?.createdById, uid)
    t.deepEqual(thought1?.version, 1)

    // by path
    await set(op, id, ['a'], ['children'])

    const thought2 = await manager.getRepository(BlockEntity).findOne(id)

    t.not(thought2, undefined, 'thought2 should not be null')
    t.deepEqual(thought2?.children, ['a'], 'thought2 content is incorrect')

    await manager.getRepository(BlockEntity).delete(id)
  }))

test('set thoughts with duplicated datetime', async (t) =>
  getConnection().transaction(async (manager) => {
    const uid = uuid()
    const op = new BlockOperation(uid, 'test', manager)
    const id1 = nanoid()
    const id2 = nanoid()

    await set(
      op,
      id1,
      {
        id: id1,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        type: BlockType.THOUGHT,
        storyId: id1,
        content: { date: '2021-03-12' },
        children: [],
        alive: true,
        createdById: uid,
      },
      [],
    )
    try {
      await set(
        op,
        id2,
        {
          id: id2,
          parentId: 'test',
          parentTable: BlockParentType.WORKSPACE,
          type: BlockType.THOUGHT,
          storyId: id2,
          content: { date: '2021-03-12' },
          children: [],
          alive: true,
          createdById: uid,
        },
        [],
      )
      t.fail()
    } catch (err) {
      console.debug(err)
    }
  }))

test('set thoughts with duplicated datetime by different users', async (t) =>
  getConnection().transaction(async (manager) => {
    const uid1 = uuid()
    const uid2 = uuid()
    const op1 = new BlockOperation(uid1, 'test', manager)
    const op2 = new BlockOperation(uid2, 'test', manager)
    const id1 = nanoid()
    const id2 = nanoid()

    await set(
      op1,
      id1,
      {
        id: id1,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        type: BlockType.THOUGHT,
        storyId: id1,
        content: { date: '2021-03-12' },
        children: [],
        alive: true,
        createdById: uid1,
      },
      [],
    )
    await set(
      op2,
      id2,
      {
        id: id2,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        type: BlockType.THOUGHT,
        storyId: id2,
        content: { date: '2021-03-12' },
        children: [],
        alive: true,
        createdById: uid2,
      },
      [],
    )

    const thought1 = await manager.getRepository(BlockEntity).findOne(id1)
    const thought2 = await manager.getRepository(BlockEntity).findOne(id2)
    t.not(thought1, undefined, 'thought1 should not be null')
    t.not(thought2, undefined, 'thought2 should not be null')
    t.deepEqual(thought1?.createdById, uid1)
    t.deepEqual(thought2?.createdById, uid2)
    t.deepEqual(thought1?.version, 1)
    t.deepEqual(thought2?.version, 1)

    await manager.getRepository(BlockEntity).delete([id1, id2])
  }))
