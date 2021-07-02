/* eslint-disable no-param-reassign */
import test, { ExecutionContext } from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository, In } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { TestHistoryStore } from '../../src/core/history'
import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { LinkEntity } from '../../src/entities/link'
import { HistoryService } from '../../src/services/history'
import { LinkType } from '../../src/types/link'
import { mockStories, mockSubBlocks, uuid } from '../testutils'

const wid = 'test'

const service = new HistoryService(new FakePermission(), new TestHistoryStore())

test.before(async (t: ExecutionContext<any>) => {
  await createDatabaseCon()

  const [story] = await mockStories(1)

  const blocks = await mockSubBlocks(3, story.id, story.id)

  // source link
  await getRepository(LinkEntity)
    .create({
      sourceBlockId: blocks[0].id,
      targetBlockId: blocks[1].id,
      type: LinkType.BLOCK,
    })
    .save()
  // target link
  await getRepository(LinkEntity)
    .create({
      sourceBlockId: blocks[2].id,
      targetBlockId: blocks[0].id,
      type: LinkType.BLOCK,
    })
    .save()

  t.context.sid = story.id
  t.context.bids = _(blocks).map('id').value()
})

test.serial('dumpAndSaveStory-restoreStoryByHistoryId', async (t: ExecutionContext<any>) => {
  const version = await service.dumpAndSaveStory(uuid(), wid, t.context.sid)
  t.not(!!version, false)

  const bid = t.context.bids[0]
  // delete block
  await getRepository(BlockEntity).update(bid, {
    alive: false,
  })
  await getRepository(LinkEntity).update({ sourceBlockId: bid }, { sourceAlive: false })
  await getRepository(LinkEntity).update({ targetBlockId: bid }, { targetAlive: false })

  // restore
  await service.restoreStoryByHistoryId(uuid(), version)

  const blocks = await getRepository(BlockEntity).find({
    id: In([t.context.sid, ...t.context.bids]),
  })
  const links = await getRepository(LinkEntity).find({
    where: [{ sourceBlockId: bid }, { targetBlockId: bid }],
  })

  t.is(blocks.length, 4)
  t.is(links.length, 2)
  t.is(_(blocks).find((b) => b.id === bid)?.alive, true)
  t.is(
    _(links).reduce((res, link) => res && link.sourceAlive && link.targetAlive, true),
    true,
  )
})

test.serial(
  'dumpAndSaveStory-restoreStoryByHistoryId-with-deleted-blocks',
  async (t: ExecutionContext<any>) => {
    const bid = t.context.bids[0]

    const otherStoryId = nanoid()
    const others = await mockSubBlocks(1, otherStoryId, otherStoryId)
    await getRepository(LinkEntity)
      .create({
        sourceBlockId: bid,
        targetBlockId: others[0].id,
        type: LinkType.BLOCK,
      })
      .save()

    const version = await service.dumpAndSaveStory('test', wid, t.context.sid)
    t.not(!!version, false)

    // delete blocks in other story
    await getRepository(BlockEntity).update(others[0].id, { alive: false })

    // delete block
    await getRepository(BlockEntity).update(bid, {
      alive: false,
    })
    await getRepository(LinkEntity).update({ sourceBlockId: bid }, { sourceAlive: false })
    await getRepository(LinkEntity).update({ targetBlockId: bid }, { targetAlive: false })

    // restore
    await service.restoreStoryByHistoryId('test', version)

    const blocks = await getRepository(BlockEntity).find({
      id: In([t.context.sid, ...t.context.bids]),
    })
    const links = await getRepository(LinkEntity).find({
      where: [
        { sourceBlockId: bid, sourceAlive: true, targetAlive: true },
        { targetBlockId: bid, sourceAlive: true, targetAlive: true },
      ],
    })

    t.is(blocks.length, 4)
    // should not be restored, so there are only two elements
    t.is(links.length, 2)
    t.is(_(blocks).find((b) => b.id === bid)?.alive, true)
    t.is(
      _(links).reduce((res, link) => res && link.sourceAlive && link.targetAlive, true),
      true,
    )
  },
)
