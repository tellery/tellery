import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { BlockService } from '../../src/services/block'
import { BlockParentType, BlockType } from '../../src/types/block'
import { defaultPermissions } from '../../src/types/permission'
import { mockBlocks, mockStories, uuid } from '../testutils'

const blockService = new BlockService(new FakePermission())

test.before(async () => {
  await createDatabaseCon()
})

test('mgetBlocks', async (t) => {
  const sid = nanoid()
  const blocks = await mockBlocks(50, sid)

  const entity = new BlockEntity()
  entity.id = sid
  entity.interKey = sid
  entity.workspaceId = 'test'
  entity.storyId = sid
  entity.parentId = nanoid()
  entity.parentTable = BlockParentType.WORKSPACE
  entity.type = BlockType.STORY
  entity.content = { title: [[nanoid()]] }
  entity.children = _(blocks).map('id').value()
  entity.permissions = defaultPermissions
  entity.alive = true
  await getRepository(BlockEntity).save(entity)

  const res = await blockService.mget('', '', _(blocks).map('id').value())

  t.is(res.length, 50)
  await getRepository(BlockEntity).delete(_(blocks).map('id').value())
})

test('mgetBlock without permissions', async (t) => {
  const sid = nanoid()
  const blocks = await mockBlocks(2, sid)

  // not alive
  blocks[1].alive = false
  await blocks[1].save()

  const res = await blockService.mget('', 'test', _(blocks).map('id').value())

  // not alive
  const deleted = _(res).find((r) => r.id === blocks[1].id)
  t.is(deleted?.alive, false)
  t.deepEqual(deleted?.content, {})
})

test('listAccessibleBlocksByStoryId with alive false blocks', async (t) => {
  const [story] = await mockStories(1, 'test')
  const [block1, block2] = await mockBlocks(2, story.id)

  // set children
  story.children = [block1.id, block2.id]
  await story.save()

  // update block alive
  block1.alive = false
  await block1.save()

  const blocks1 = await blockService.listAccessibleBlocksByStoryId(uuid(), 'test', story.id)
  t.is(blocks1.length, 3)

  story.children = [block1.id]
  await story.save()

  const blocks2 = await blockService.listAccessibleBlocksByStoryId(uuid(), 'test', story.id)
  t.is(blocks2.length, 2)
})
