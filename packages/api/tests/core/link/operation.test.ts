import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { BlockOperation } from '../../../src/core/block/operation'
import BlockEntity from '../../../src/entities/block'
import { LinkEntity } from '../../../src/entities/link'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { mockStories, set, update, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('setTextBlockLinks', async (t) =>
  getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    const id = nanoid()

    const stories = await mockStories(2)

    await set(
      op,
      id,
      {
        id,
        type: BlockType.TEXT,
        storyId: 'storyId',
        parentId: 'storyId',
        parentTable: BlockParentType.BLOCK,
        content: {
          title: [[id], ['‣', [['r', 's', stories[0].id]]]],
        },
        alive: true,
        createdById: uuid(),
      },
      [],
    )

    let models = _(
      await manager.getRepository(LinkEntity).find({
        where: {
          sourceBlockId: id,
        },
        relations: ['sourceBlock', 'targetBlock'],
      }),
    )

    t.not(
      models.find(
        (l) => l.sourceBlock.storyId === 'storyId' && l.targetBlock.storyId === stories[0].id,
      ),
      undefined,
    )

    // update link
    await update(
      op,
      id,
      [[id], ['‣', [['r', 's', stories[1].id]]]],

      ['content', 'title'],
    )
    models = _(
      await manager.getRepository(LinkEntity).find({
        where: {
          sourceBlockId: id,
        },
        relations: ['sourceBlock', 'targetBlock'],
      }),
    )

    // original link got deleted
    t.is(
      models.find(
        (l) => l.sourceBlock.storyId === 'storyId' && l.targetBlock.storyId === stories[0].id,
      ),
      undefined,
    )

    // new link got created
    t.not(
      models.find(
        (l) => l.sourceBlock.storyId === 'storyId' && l.targetBlock.storyId === stories[1].id,
      ),
      undefined,
    )
    await manager.getRepository(LinkEntity).delete({ sourceBlockId: id })
    await manager.getRepository(BlockEntity).delete([id, ..._(stories).map('id').value()])
  }))

test('deleteBlockShouldAlsoRemoveLinks', async (t) =>
  getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    const id = nanoid()

    const stories = await mockStories(2)

    await set(
      op,
      id,
      {
        id,
        type: BlockType.TEXT,
        storyId: 'storyId',
        parentId: 'storyId',
        parentTable: BlockParentType.BLOCK,
        content: {
          title: [[id], ['‣', [['r', 's', stories[0].id]]]],
        },
        alive: true,
        createdById: uuid(),
      },
      [],
    )

    let models = await manager.getRepository(LinkEntity).find({
      where: {
        sourceBlockId: id,
      },
      relations: ['sourceBlock', 'targetBlock'],
    })

    t.not(
      models.find(
        (i) => i.sourceBlock.storyId === 'storyId' && i.targetBlock.storyId === stories[0].id,
      ),
      undefined,
    )

    // update link
    await update(op, id, false, ['alive'])
    models = await manager.getRepository(LinkEntity).find({
      where: {
        sourceBlockId: id,
      },
      relations: ['sourceBlock', 'targetBlock'],
    })

    // original link got deleted
    t.is(
      models.find(
        (i) => i.sourceBlock.storyId === 'storyId' && i.targetBlock.storyId === stories[0].id,
      ),
      undefined,
    )
    await manager.getRepository(LinkEntity).delete({ sourceBlockId: id })
    await manager.getRepository(BlockEntity).delete([id, ..._(stories).map('id').value()])
  }))
