import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'

import { QuestionBlock } from '../../../src/core/block/question'
import { translate } from '../../../src/core/translator/dbt'
import { BlockParentType } from '../../../src/types/block'

test('dbt translate (ephemeral)', async (t) => {
  const compiledSql = 'select col from arbitrary_table'
  const dbtBlock = new QuestionBlock(
    'id',
    'parentId',
    BlockParentType.BLOCK,
    'storyId',
    { materialized: 'ephemeral', compiledSql },
    true,
    0,
  )
  // hack
  _.set(dbtBlock, 'type', 'dbt')

  const sql = translate(dbtBlock)
  t.is(sql, compiledSql)
})

test('dbt translate (other)', async (t) => {
  const dbtBlock = new QuestionBlock(
    'id',
    'parentId',
    BlockParentType.BLOCK,
    'storyId',
    { materialized: 'table', relationName: 'dbname.event' },
    true,
    0,
  )
  // hack
  _.set(dbtBlock, 'type', 'dbt')

  const sql = translate(dbtBlock)
  t.is(sql, 'select * from dbname.event')
})
