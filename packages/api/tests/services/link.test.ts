import test from 'ava'
import { getRepository, In } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { Link } from '../../src/core/link'
import BlockEntity from '../../src/entities/block'
import { LinkEntity } from '../../src/entities/link'

import linkService from '../../src/services/link'
import { LinkType } from '../../src/types/link'
import { mockBlocks, mockStories } from '../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('mgetEntitiesByLinks', async (t) => {
  const story = (await mockStories(1))[0]
  const block = (await mockBlocks(1, story.id))[0]

  const res = await linkService.mgetEntitiesByLinks('', '', [
    { blockId: story.id, type: LinkType.BLOCK },
    { blockId: block.id, type: LinkType.BLOCK },
  ])
  await getRepository(BlockEntity).delete({ id: In([block.id, story.id]) })

  t.is(res.length, 2)
})

test('mgetLinks', async (t) => {
  const stories = await mockStories(3)
  const blocks0 = await mockBlocks(2, stories[0].id)
  const blocks1 = await mockBlocks(2, stories[1].id)
  const blocks2 = await mockBlocks(2, stories[2].id)

  // blocks 0 0 -> blocks 1 1
  await getRepository(LinkEntity)
    .create({
      sourceBlockId: blocks0[0].id,
      targetBlockId: blocks1[1].id,
      type: LinkType.BLOCK,
    })
    .save()

  // blocks 0 1 -> blocks 2 0
  await getRepository(LinkEntity)
    .create({
      sourceBlockId: blocks0[1].id,
      targetBlockId: blocks2[0].id,
      type: LinkType.BLOCK,
    })
    .save()

  // blocks 1 1 -> blocks 2 0
  await getRepository(LinkEntity)
    .create({
      sourceBlockId: blocks1[1].id,
      targetBlockId: blocks2[0].id,
      type: LinkType.BLOCK,
    })
    .save()

  // blocks 2 1 -> blocks 1 1

  await getRepository(LinkEntity)
    .create({
      sourceBlockId: blocks2[1].id,
      targetBlockId: blocks1[1].id,
      type: LinkType.QUESTION,
    })
    .save()

  const res = await linkService.mgetLinks('', '', [
    { storyId: stories[0].id },
    { storyId: stories[1].id },
    { storyId: stories[2].id },
    { blockId: blocks1[1].id },
    { blockId: blocks2[1].id },
  ])

  const linkSortFn = (a: Link, b: Link) => ((a.blockId ?? '') > (b.blockId ?? '') ? 1 : -1)

  const resStory0 = res.find((i) => i.id === stories[0].id)
  t.deepEqual(
    resStory0!.forwardRefs.sort(linkSortFn),
    [
      { blockId: blocks1[1].id, storyId: stories[1].id, type: LinkType.BLOCK },
      { blockId: blocks2[0].id, storyId: stories[2].id, type: LinkType.BLOCK },
    ].sort(linkSortFn),
  )

  const resStory2 = res.find((i) => i.id === stories[2].id)
  t.deepEqual(resStory2!.forwardRefs, [
    { blockId: blocks1[1].id, storyId: stories[1].id, type: LinkType.QUESTION },
  ])
  t.deepEqual(
    resStory2!.backwardRefs.sort(linkSortFn),
    [
      { blockId: blocks0[1].id, storyId: stories[0].id, type: LinkType.BLOCK },
      { blockId: blocks1[1].id, storyId: stories[1].id, type: LinkType.BLOCK },
    ].sort(linkSortFn),
  )

  const resBlocks11 = res.find((i) => i.id === blocks1[1].id)
  t.deepEqual(resBlocks11!.forwardRefs, [
    { blockId: blocks2[0].id, storyId: stories[2].id, type: LinkType.BLOCK },
  ])
  t.deepEqual(
    resBlocks11!.backwardRefs.sort(linkSortFn),
    [
      { blockId: blocks0[0].id, storyId: stories[0].id, type: LinkType.BLOCK },
      { blockId: blocks2[1].id, storyId: stories[2].id, type: LinkType.QUESTION },
    ].sort(linkSortFn),
  )

  const resBlock21 = res.find((i) => i.id === blocks2[1].id)
  t.deepEqual(resBlock21, {
    id: blocks2[1].id,
    blockId: blocks2[1].id,
    forwardRefs: [{ blockId: blocks1[1].id, storyId: stories[1].id, type: LinkType.QUESTION }],
    backwardRefs: [],
  })
})
