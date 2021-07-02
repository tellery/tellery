import '../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { Link } from '../../src/core/link'
import { FakePermission } from '../../src/core/permission'
import { getISearch } from '../../src/core/search/interface'
import BlockEntity from '../../src/entities/block'
import { LinkEntity } from '../../src/entities/link'
import { UserEntity } from '../../src/entities/user'
import { StoryService } from '../../src/services/story'
import { BlockParentType, BlockType } from '../../src/types/block'
import { LinkType } from '../../src/types/link'
import { defaultPermissions } from '../../src/types/permission'
import { mockBlocks, mockStories } from '../testutils'

const storyService = new StoryService(new FakePermission(), getISearch())

test.before(async () => {
  await createDatabaseCon()
})

test('mgetStoryLinks', async (t) => {
  const linkSortFn = (a: Link, b: Link) => ((a.blockId ?? '') > (b.blockId ?? '') ? 1 : -1)
  const [sourceStory, targetStory] = await mockStories(2)
  const [sourceBlock, sourceBlock2] = await mockBlocks(2, sourceStory.id)
  const [targetBlock, targetBlock2] = await mockBlocks(2, targetStory.id)

  // forward to story
  await getRepository(LinkEntity).insert({
    sourceBlockId: sourceBlock.id,
    targetBlockId: targetStory.id,
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })
  // forward to block
  await getRepository(LinkEntity).insert({
    sourceBlockId: sourceBlock.id,
    targetBlockId: targetBlock.id,
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })
  // backward
  await getRepository(LinkEntity).insert({
    sourceBlockId: targetBlock2.id,
    targetBlockId: sourceBlock2.id,
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })
  const links = await storyService.mgetLinks('', '', [sourceStory.id])
  const link = _(links).find((l) => l.storyId === sourceStory.id)
  t.not(link, undefined)
  t.deepEqual(
    link!.forwardRefs.sort(linkSortFn),
    [
      {
        storyId: targetStory.id,
        blockId: targetStory.id,
        type: LinkType.BLOCK,
      },
      {
        storyId: targetStory.id,
        blockId: targetBlock.id,
        type: LinkType.BLOCK,
      },
    ].sort(linkSortFn),
  )
  t.deepEqual(
    link!.backwardRefs.sort(linkSortFn),
    [
      {
        storyId: targetStory.id,
        blockId: targetBlock2.id,
        type: LinkType.BLOCK,
      },
    ].sort(linkSortFn),
  )
  await getRepository(BlockEntity).delete(
    _([sourceStory, targetStory, sourceBlock, sourceBlock2, targetBlock, targetBlock2])
      .map('id')
      .value(),
  )
  await getRepository(LinkEntity).delete(_(links).map('id').value())
})

test('getAllRelatedStories', async (t) => {
  const stories = await mockStories(10)
  const ids = _(stories).map('id').value()
  // linked to others
  const [blockOf0] = await mockBlocks(1, ids[0])
  const [blockOf2] = await mockBlocks(1, ids[2])
  const l1 = await getRepository(LinkEntity).save({
    sourceBlockId: blockOf0.id,
    targetBlockId: ids[5],
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })
  // being linked
  const l2 = await getRepository(LinkEntity).save({
    sourceBlockId: blockOf2.id,
    targetBlockId: ids[0],
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })
  const res1 = await storyService.getAllRelatedStories([ids[0], ids[5]])

  await getRepository(LinkEntity).delete([l1.id, l2.id])
  await getRepository(BlockEntity).delete([blockOf0.id, blockOf2.id, ...ids])

  t.is(res1[ids[0]].length, 2)
  t.is(res1[ids[5]].length, 1)
})

test('searchStoriesInService', async (t) => {
  const user = await getRepository(UserEntity)
    .create({
      username: nanoid(),
      email: nanoid(),
      avatar: nanoid(),
      password: nanoid(),
    })
    .save()

  const title = nanoid()
  const bid = nanoid()
  const sid1 = nanoid()

  const story1 = await getRepository(BlockEntity).save({
    id: sid1,
    workspaceId: 'test',
    interKey: sid1,
    parentId: nanoid(),
    parentTable: BlockParentType.WORKSPACE,
    storyId: sid1,
    content: { title: [[title]] },
    type: BlockType.STORY,
    searchableText: title,
    permissions: defaultPermissions,
    children: [bid],
    alive: true,
    createdById: user.id,
  })

  const [srcBlock] = await mockBlocks(1, sid1)
  const [targetStory] = await mockStories(1)

  const block = await getRepository(BlockEntity).save({
    id: bid,
    workspaceId: 'test',
    interKey: bid,
    storyId: story1.id,
    parentId: story1.id,
    parentTable: BlockParentType.BLOCK,
    type: BlockType.TEXT,
    content: { title: [[bid]] },
    searchableText: bid,
    permissions: defaultPermissions,
    alive: true,
    createdById: user.id,
  })

  const link = await getRepository(LinkEntity).save({
    sourceBlockId: srcBlock.id,
    targetBlockId: targetStory.id,
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })

  const res1 = await storyService.search(story1.parentId, 'test', title)

  t.not(res1.results.searchResults.length, 0)
  const storyIdByRes1 = _(res1.results.searchResults).find((s) => s === story1.id)!

  t.not(storyIdByRes1, undefined)
  t.deepEqual(res1.results.links[storyIdByRes1].length, 1)
  t.not(res1.results.users![user.id], undefined)

  const res2 = await storyService.search(story1.parentId, 'test', bid)
  const blockByRes2 = _(res2.results.blocks).find((s) => s.id === story1.id)!

  t.not(blockByRes2, undefined)

  await getRepository(BlockEntity).update({ id: story1.id }, { alive: false })

  // should not be searched (with keyword)
  const res3 = await storyService.search(story1.parentId, 'test', `${title}fake`)
  const storyIdByRes3 = _(res3.results.searchResults).find((s) => s === story1.id)!
  t.is(storyIdByRes3, undefined)

  // should not be searched (without keyword)
  const res4 = await storyService.search(story1.parentId, 'test', '')
  const storyIdByRes4 = _(res4.results.searchResults).find((s) => s === story1.id)!
  t.is(storyIdByRes4, undefined)

  await getRepository(UserEntity).delete(user.id)
  await getRepository(BlockEntity).delete([story1.id, srcBlock.id, targetStory.id, block.id])
  await getRepository(LinkEntity).delete(link.id)
})

test('recordVisit and getVisits', async (t) => {
  const ts = _.now()
  await storyService.recordVisit('test', 'testUser', 'testStory', ts)
  await storyService.recordVisit('test', 'unknown', 'testStory', ts)

  const visits = await storyService.getVisits('test', 'testUser', 'testStory')
  t.is(visits.length > 1, true)
  const visit = _(visits).find((v) => v.userId === 'testUser' && v.storyId === 'testStory')

  t.not(visit, undefined)
  t.deepEqual(visit?.lastVisitTimestamp, ts)
})
