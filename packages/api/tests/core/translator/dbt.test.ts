import '../../../src/core/block/init'

import test from 'ava'

import { translate } from '../../../src/core/translator/dbt'
import { BlockParentType } from '../../../src/types/block'
import { DbtBlock } from '../../../src/core/block/dbt'

test('dbt translate (ephemeral)', async (t) => {
  const compiledSql = 'select col from arbitrary_table'
  const dbtBlock = new DbtBlock(
    'id',
    'parentId',
    BlockParentType.BLOCK,
    'storyId',
    { materialized: 'ephemeral', compiledSql },
    true,
    0,
  )

  const sql = translate(dbtBlock)
  t.is(sql, compiledSql)
})

test('dbt translate (other)', async (t) => {
  const dbtBlock = new DbtBlock(
    'id',
    'parentId',
    BlockParentType.BLOCK,
    'storyId',
    { materialized: 'table', relationName: 'dbname.event' },
    true,
    0,
  )

  const sql = translate(dbtBlock)
  t.is(sql, 'SELECT * from dbname.event')
})
