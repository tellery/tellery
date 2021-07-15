import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'

import { QuestionBlock } from '../../../src/core/block/question'
import { translate } from '../../../src/core/translator/dbt'
import { BlockParentType } from '../../../src/types/block'

test('dbt translate', async (t) => {
  const dbtBlock = new QuestionBlock(
    'id',
    'parentId',
    BlockParentType.BLOCK,
    'storyId',
    { type: 'source' },
    true,
    0,
  )
  // hack
  _.set(dbtBlock, 'type', 'dbt')

  const sql = translate(dbtBlock)
  t.is(sql, "source('id')")
})
