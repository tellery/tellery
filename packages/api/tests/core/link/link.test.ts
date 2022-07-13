import test from 'ava'
import _ from 'lodash'
import { getRepository, In } from 'typeorm'
import { createDatabaseCon } from '../../../src/clients/db/orm'

import { getLinksFromToken } from '../../../src/core/link'
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
  const story = getLinksFromToken([['‣', [['r', 's', 'lYQZVPExSyRMbKb7lICsY']]]])
  t.deepEqual(story, [
    {
      blockId: 'lYQZVPExSyRMbKb7lICsY',
      type: LinkType.BLOCK,
    },
  ])
  const block = getLinksFromToken([['‣', [['r', 'b', 'lYQZVPExSyRMbKb7lICsY']]]])
  t.deepEqual(block, [
    {
      blockId: 'lYQZVPExSyRMbKb7lICsY',
      type: LinkType.BLOCK,
    },
  ])
  const block2 = getLinksFromToken([[' ', [['r', 'b', 'lYQZVPExSyRMbKb7lICsY']]]])
  t.deepEqual(block2, [
    {
      blockId: 'lYQZVPExSyRMbKb7lICsY',
      type: LinkType.BLOCK,
    },
  ])
})
