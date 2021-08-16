import test from 'ava'
import { nanoid } from 'nanoid'

import { SqlBlock } from '../../../src/core/block/sql'
import { BlockParentType } from '../../../src/types/block'
import { LinkType } from '../../../src/types/link'

test('getLinksFromSql', (t) => {
  const block = new SqlBlock(
    nanoid(),
    nanoid(),
    BlockParentType.BLOCK,
    nanoid(),
    { sql: 'select * from {{bid}}' },
    true,
    0,
  )
  const links = block.getLinksFromContent()
  t.deepEqual(links, [
    {
      blockId: 'bid',
      type: LinkType.QUESTION,
    },
  ])
})
