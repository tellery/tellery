import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { Block } from '../../../src/core/block'
import { BlockOperation } from '../../../src/core/block/operation'
import BlockEntity from '../../../src/entities/block'
import { LinkEntity } from '../../../src/entities/link'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { mockBlocks, mockStories, remove, set, update, updateIndex, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('set story block', async (t) => {
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    const id = nanoid()

    const uid = uuid()

    await set(
      op,
      id,
      {
        id,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        type: BlockType.STORY,
        storyId: id,
        content: { title: [[nanoid()]] },
        children: [],
        alive: true,
        createdById: uid,
      },
      [],
    )

    const story = await manager.getRepository(BlockEntity).findOne(id)

    t.not(story, undefined)
    t.deepEqual(story?.children, [])
    t.deepEqual(story?.parentId, 'test')
    t.deepEqual(story?.createdById, uid)
    t.deepEqual(story?.version, 1)
  })
})

test('set story block by path', async (t) => {
  const [{ id }] = await mockStories(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    // by path
    await set(op, id, ['a'], ['children'])

    const story = await manager.getRepository(BlockEntity).findOne(id)

    t.not(story, undefined, 'story2 should not be null')
    t.deepEqual(story?.children, ['a'], 'story2 content is incorrect')
  })
})

test('update story', async (t) => {
  const [{ id }] = await mockStories(1)
  const randomUUID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    await update(op, id, ['a'], ['children'])
    await update(op, id, randomUUID, ['createdById'])

    const story = await manager.getRepository(BlockEntity).findOne(id)

    t.not(story, null, 'story should not be null')
    t.deepEqual(story?.children, ['a'], 'story1 children is incorrect')
    t.is(story?.alive, true)
    t.deepEqual(story?.version, 3)
    t.deepEqual(story?.createdById, randomUUID)
  })
})

test('remove child from story', async (t) => {
  const [{ id }] = await mockStories(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    const oid = nanoid()

    // set content
    await update(op, id, { content: { title: [[nanoid()]] } }, [])

    await remove(op, id, oid, ['children'])

    const story = await manager.getRepository(BlockEntity).findOne(id)
    t.not(story, null)
    t.deepEqual(story?.children, [])
    t.deepEqual(story?.version, 3)
  })
})

test('update child blocks index', async (t) => {
  const [{ id }] = await mockStories(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    await updateIndex(op, id, 'b', ['children'], 'after')
    const story1 = await manager.getRepository(BlockEntity).findOne(id)
    t.deepEqual(story1?.children, ['b'])
    t.deepEqual(story1?.version, 2)

    await updateIndex(op, id, 'a', ['children'], 'before', 'b')
    const story2 = await manager.getRepository(BlockEntity).findOne(id)
    t.deepEqual(story2?.children, ['a', 'b'])
    t.deepEqual(story2?.version, 3)

    await updateIndex(op, id, 'c', ['children'], 'before', 'b')
    const story3 = await manager.getRepository(BlockEntity).findOne(id)
    t.deepEqual(story3?.children, ['a', 'c', 'b'])
    t.deepEqual(story3?.version, 4)
  })
})

test('update multi children indexes', async (t) => {
  const [{ id }] = await mockStories(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    await update(op, id, { children: ['a', 'b'] }, [])

    let q = await op.entity(id)
    q = await op.remove(q, 'a', ['children'])
    q = await op.updateIndex(q, 'a', ['children'], 'after', 'b')
    await op.save(q, await op.findInDB(id))

    const model = await manager.getRepository(BlockEntity).findOne({ id, alive: true })
    t.deepEqual(model?.children, ['b', 'a'])

    const memory = await op.updateIndex(
      { id: 'test', children: ['b'] } as Block,
      'a',
      ['children'],
      'after',
      'b',
    )
    t.deepEqual(memory, { id: 'test', children: ['b', 'a'] } as Block)
  })
})

test('update children blocks alive', async (t) => {
  const [{ id: sid }] = await mockStories(1)
  const [{ id: bid }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    // set story
    await update(op, sid, { children: [bid] }, [])

    // delete story
    await set(op, sid, false, ['alive'])

    let block = await manager.getRepository(BlockEntity).findOne(bid)
    t.is(block?.alive, false)

    // revert story
    await set(op, sid, true, ['alive'])

    block = await manager.getRepository(BlockEntity).findOne(bid)
    t.is(block?.alive, true)
  })
})

test('links should be handled when updating alive of story', async (t) => {
  const [{ id: sid }] = await mockStories(1)
  const [{ id: bid1 }, { id: bid2 }] = await mockBlocks(2, sid)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    // set block
    await update(op, bid1, { content: { title: [['‣', [['r', 's', sid]]]] } }, [])
    await update(op, bid2, { content: { title: [['‣', [['r', 's', sid]]]] } }, [])

    // set story
    await update(op, sid, { children: [bid1, bid2] }, [])

    // delete story
    await set(op, sid, false, ['alive'])
    const links1 = await manager
      .getRepository(LinkEntity)
      .createQueryBuilder('links')
      .innerJoinAndSelect('links.sourceBlock', 'sourceBlock')
      .where('sourceBlock.storyId = :sid', { sid })
      .getMany()
    _(links1).forEach((l) => {
      t.is(l.sourceAlive, false)
      t.is(l.targetAlive, false)
    })

    // revert story
    await set(op, sid, true, ['alive'])
    const links2 = await manager
      .getRepository(LinkEntity)
      .createQueryBuilder('links')
      .innerJoinAndSelect('links.sourceBlock', 'sourceBlock')
      .where('sourceBlock.storyId = :sid', { sid })
      .getMany()
    const link1 = _(links2).find((l) => l.sourceBlockId === bid1)
    t.is(link1?.sourceAlive, true)
    const link2 = _(links2).find((l) => l.sourceBlockId === bid2)
    t.is(link2?.sourceAlive, true)
  })
})
