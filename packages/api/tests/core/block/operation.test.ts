import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { BlockOperation } from '../../../src/core/block/operation'
import BlockEntity from '../../../src/entities/block'
import { LinkEntity } from '../../../src/entities/link'
import { BlockParentType, BlockType } from '../../../src/types/block'
import {
  defaultPermissions,
  PermissionEntityRole,
  PermissionEntityRoleType,
} from '../../../src/types/permission'
import { mockBlocks, mockStories, remove, set, setPermissions, update, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('set block', async (t) => {
  return getConnection().transaction(async (manager) => {
    const id = nanoid()
    const uid = uuid()
    const op = new BlockOperation(uid, 'test', manager)

    await set(
      op,
      id,
      {
        id,
        type: BlockType.TEXT,
        storyId: 'storyId',
        parentId: 'storyId',
        parentTable: BlockParentType.BLOCK,
        format: { width: 100 },
        content: {
          title: [['field1']],
        },
        alive: true,
        children: ['child'],
        createdById: uid,
      },
      [],
    )
    const block = await manager.getRepository(BlockEntity).findOne(id)
    t.not(block, null)
    t.deepEqual(block?.content, {
      title: [['field1']],
    })
    t.deepEqual(block?.createdById, uid)
    t.deepEqual(block?.workspaceId, 'test')
    t.deepEqual(block?.searchableText, 'field1')
    t.deepEqual(Array.from(block?.permissions!), defaultPermissions)
    t.deepEqual(_.get(block?.children, 0), 'child')
    t.deepEqual(block?.format, { width: 100 })
    t.is(block?.alive, true)
  })
})

test('set block by path', async (t) => {
  const [{ id }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation('test', 'test', manager)
    await set(op, id, ['value1'], ['content', 'field1'])

    const block = await manager.getRepository(BlockEntity).findOne(id)

    t.not(block, null, 'block2 should not be null')
    t.deepEqual((block?.content as any).field1, ['value1'])
    t.deepEqual(block?.id, id)
  })
})

test('set block type', async (t) => {
  const [{ id }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation('test', 'test', manager)
    await set(
      op,
      id,
      {
        id,
        type: BlockType.HEADING_1,
        storyId: 'storyId',
        parentId: 'storyId',
        parentTable: BlockParentType.BLOCK,
        content: {
          field1: 'field1',
        },
        alive: true,
      },
      [],
    )
    const block = await manager.getRepository(BlockEntity).findOne(id)

    t.not(block, null)
    t.deepEqual(block?.type, BlockType.HEADING_1)
    t.deepEqual(block?.version, 2)
  })
})

test('set block only type', async (t) => {
  const [{ id }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    // update type
    await set(op, id, BlockType.TEXT, ['type'])
    const block = await manager.getRepository(BlockEntity).findOne(id)

    t.not(block, null)
    t.deepEqual(block?.type, BlockType.TEXT)
    t.deepEqual(block?.version, 2)
  })
})

test('update block', async (t) => {
  const [{ id }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    await update(
      op,
      id,
      {
        field2: 'newField2',
      },
      ['content'],
    )
    const block = await manager.getRepository(BlockEntity).findOne(id)
    t.not(block, null, 'block1 should not be null')
    t.deepEqual((block?.content as any).title, [['hello world']])
    t.deepEqual((block?.content as any).field2, 'newField2')
  })
})

test('delete block content', async (t) => {
  const [{ id }] = await mockBlocks(1)
  const content = nanoid()
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    await set(op, id, [content], ['content'])

    await remove(op, id, content, ['content'])
    const block = await manager.getRepository(BlockEntity).findOne(id)
    t.not(block, null, 'block1 should not be null')
    t.deepEqual(block?.content, [], 'block1 content is incorrect')
  })
})

test('update block alive', async (t) => {
  const [{ id }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    await update(
      op,
      id,
      {
        alive: false,
      },
      [],
    )
    const block = await manager.getRepository(BlockEntity).findOne({ id, alive: true })
    t.is(block, undefined, 'block1 should not be null')
  })
})

test('link should be handled when block is deleted', async (t) => {
  const [{ id }] = await mockBlocks(1)
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    const sid = nanoid()

    await set(op, id, { title: [[id], ['‣', [['r', 's', sid]]], ['‣', [['r', 's', sid]]]] }, [
      'content',
    ])
    // link is created
    let link = await manager.getRepository(LinkEntity).findOne({ sourceBlockId: id })
    t.not(link, undefined)
    t.is(link?.sourceAlive, true)

    await set(op, id, false, ['alive'])

    // link should be deleted
    link = await manager.getRepository(LinkEntity).findOne({ sourceBlockId: id })
    t.is(link, undefined)

    await set(op, id, true, ['alive'])
    // link should be reverted
    link = await manager.getRepository(LinkEntity).findOne({ sourceBlockId: id })
    t.not(link, undefined)
    t.is(link?.sourceAlive, true)
  })
})

test('set permissions', async (t) => {
  const [story] = await mockStories(1)
  const blocks = await mockBlocks(10, story.id)

  await getRepository(BlockEntity).update(story.id, { children: _(blocks).map('id').value() })

  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    await setPermissions(
      op,
      story.id,
      [
        {
          role: PermissionEntityRole.EDITOR,
          type: PermissionEntityRoleType.WORKSPACE,
        },
      ],
      ['permissions'],
    )

    const storyBlock = await manager.getRepository(BlockEntity).findOne(story.id)
    const childrenBlock = await manager.getRepository(BlockEntity).findOne(blocks[0].id)

    t.deepEqual(storyBlock?.permissions, [
      {
        role: PermissionEntityRole.EDITOR,
        type: PermissionEntityRoleType.WORKSPACE,
      },
    ])
    t.deepEqual(childrenBlock?.permissions, [
      {
        role: PermissionEntityRole.EDITOR,
        type: PermissionEntityRoleType.WORKSPACE,
      },
    ])
  })
})

test('set permissions with invalid args', async (t) => {
  const [story] = await mockStories(1)

  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    try {
      await setPermissions(
        op,
        story.id,
        [
          {
            msg: 'invalid args',
          },
        ],
        ['permissions'],
      )
      t.fail()
    } catch (_err) {
      t.pass()
    }
  })
})
