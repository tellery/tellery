import test from 'ava'
import _ from 'lodash'
import { getRepository, In } from 'typeorm'
import { createDatabaseCon } from '../../../src/clients/db/orm'

import { getLinksFromSql, getLinksFromToken } from '../../../src/core/link'
import BlockEntity from '../../../src/entities/block'
import { LinkType } from '../../../src/types/link'
import { mockBlocks, mockStories } from '../../testutils'

let blocks: BlockEntity[]
let stories: BlockEntity[]

test.before(async () => {
  await createDatabaseCon()

  stories = await mockStories(2)
  blocks = await mockBlocks(2, stories[0].id)
})

test.after.always(async () => {
  await getRepository(BlockEntity).delete({
    id: In([..._(stories).map('id').value(), ..._(blocks).map('id').value()]),
  })
})

test('getLinksFromToken', (t) => {
  const story = getLinksFromToken([['‣', [['r', 's', 'sid']]]])
  t.deepEqual(story, [
    {
      blockId: 'sid',
      type: LinkType.BLOCK,
    },
  ])
  const block = getLinksFromToken([['‣', [['r', 'b', 'bid']]]])
  t.deepEqual(block, [
    {
      blockId: 'bid',
      type: LinkType.BLOCK,
    },
  ])
  const block2 = getLinksFromToken([[' ', [['r', 'b', 'bid']]]])
  t.deepEqual(block2, [
    {
      blockId: 'bid',
      type: LinkType.BLOCK,
    },
  ])
})

test('getLinksFromSql', (t) => {
  const question = getLinksFromSql('select * from {{bid}}')
  t.deepEqual(question, [
    {
      blockId: 'bid',
      type: LinkType.QUESTION,
    },
  ])
})
