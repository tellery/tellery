import '../../../src/core/block/init'

import test from 'ava'
import { debug } from 'console'
import { nanoid } from 'nanoid'
import { getConnection } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { BlockOperation } from '../../../src/core/block/operation'
import { WorkspaceView } from '../../../src/core/workspaceView'
import { WorkspaceViewOperation } from '../../../src/core/workspaceView/operation'
import { WorkspaceViewEntity } from '../../../src/entities/workspaceView'
import { BlockType } from '../../../src/types/block'
import { remove, set, update, updateIndex, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('removeFromWorkspaceView', async (t) => {
  const userId = nanoid()
  return getConnection().transaction(async (manager) => {
    const op = new WorkspaceViewOperation(userId, 'test', manager)
    const id1 = nanoid()
    const id2 = nanoid()
    const id3 = nanoid()

    const model = await manager
      .getRepository(WorkspaceViewEntity)
      .create({
        workspaceId: 'test',
        userId,
        pinnedList: [id1, id2, id3],
      })
      .save()

    await remove(op, model.id, id3, ['pinnedList'])

    const view = await manager.getRepository(WorkspaceViewEntity).findOne(model.id)
    t.not(view, null, 'view should not be null')
    t.deepEqual(view?.pinnedList, [id1, id2], 'view pinnedList is incorrect')

    await manager.getRepository(WorkspaceViewEntity).delete(model.id)
  })
})

test('updatePinnedListIndex', async (t) => {
  const userId = nanoid()
  return getConnection().transaction(async (manager) => {
    const op = new WorkspaceViewOperation(userId, 'test', manager)

    const model = await manager.getRepository(WorkspaceViewEntity).save({
      workspaceId: 'test',
      userId,
      pinnedList: [],
    })
    const { id } = model

    await updateIndex(op, id, 'b', ['pinnedList'], 'after')
    const view1 = await manager.getRepository(WorkspaceViewEntity).findOne(id)
    t.deepEqual(view1?.pinnedList, ['b'])

    await updateIndex(op, id, 'a', ['pinnedList'], 'before', 'b')
    const view2 = await manager.getRepository(WorkspaceViewEntity).findOne(id)
    t.deepEqual(view2?.pinnedList, ['a', 'b'])

    try {
      // duplicate
      await updateIndex(op, id, 'a', ['pinnedList'], 'before', 'b')
      t.fail()
    } catch (err) {
      debug(err)
      t.pass()
    }

    await manager.getRepository(WorkspaceViewEntity).delete(id)
  })
})

test('updateMultiPinnedListIndex', async (t) => {
  const userId = nanoid()
  return getConnection().transaction(async (manager) => {
    const op = new WorkspaceViewOperation(userId, 'test', manager)
    const { id } = await manager.getRepository(WorkspaceViewEntity).save({
      workspaceId: 'test',
      userId,
      pinnedList: ['a', 'b'],
    })

    let q = await op.entity(id)
    q = await op.remove(q, 'a', ['pinnedList'])
    q = (await op.updateIndex(q, 'a', ['pinnedList'], 'after', 'b')) as WorkspaceView
    await op.save(q)

    const model = await manager.getRepository(WorkspaceViewEntity).findOne(id)

    t.deepEqual(model?.pinnedList, ['b', 'a'])

    const entity = new WorkspaceViewEntity()
    entity.id = 'test'
    entity.workspaceId = 'test'
    entity.userId = uuid()
    entity.pinnedList = ['b']
    const view = WorkspaceView.fromEntity(entity)
    const memory = await op.updateIndex(view, 'a', ['pinnedList'], 'after', 'b')
    view.pinnedList = ['b', 'a']
    t.deepEqual(memory, view)

    await manager.getRepository(WorkspaceViewEntity).delete(id)
  })
})

test('deleteStoryAndPinnedList', async (t) => {
  const userId = nanoid()
  return getConnection().transaction(async (manager) => {
    const op = new BlockOperation(userId, 'test', manager)
    const sid = nanoid()

    await set(
      op,
      sid,
      {
        id: sid,
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid,
        type: BlockType.STORY,
        content: { title: [[nanoid()]] },
        children: ['a', 'b'],
        alive: true,
      },
      [],
    )
    const { id: wid } = await manager.getRepository(WorkspaceViewEntity).save({
      workspaceId: 'test',
      userId,
      pinnedList: [sid, 'testStory'],
    })
    await update(op, sid, false, ['alive'])

    const model = await manager.getRepository(WorkspaceViewEntity).findOne(wid)

    t.deepEqual(model?.pinnedList, ['testStory'])
    await manager.getRepository(WorkspaceViewEntity).delete(wid)
  })
})
