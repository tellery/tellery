import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { extractPartialQueries, match, translate } from '../../../src/core/translator/dbt'
import BlockEntity from '../../../src/entities/block'
import { BlockParentType, BlockType } from '../../../src/types/block'

test.before(async () => {
  await createDatabaseCon()
})

test('dbt match', async (t) => {
  const f = match('{{xxx}}')
  const t1 = match('{{dbt: test}}')
  const t2 = match('{{dbt:test}}')

  t.is(f, false)
  t.is(t1, true)
  t.is(t2, true)
})

test('dbt extractPartialQueries', async (t) => {
  const queries = extractPartialQueries(
    'select * from {{ dbt: test_1 }} where id = ( select id from {{ dbt: test_2 }} )',
  )
  // ignore alias
  t.deepEqual(
    _(queries)
      .map(({ startIndex, endIndex, dbt }) => ({ startIndex, endIndex, dbt }))
      .value(),
    [
      { startIndex: 14, endIndex: 31, dbt: 'test_1' },
      { startIndex: 60, endIndex: 77, dbt: 'test_2' },
    ],
  )
})

test('dbt translate', async (t) => {
  const key1 = nanoid()
  const block1 = await getRepository(BlockEntity).save({
    id: nanoid(),
    interKey: key1,
    workspaceId: nanoid(),
    storyId: nanoid(),
    parentId: nanoid(),
    parentTable: BlockParentType.BLOCK,
    type: 'dbt' as BlockType,
    content: { type: 'ref' },
  })

  const key2 = nanoid()
  const block2 = await getRepository(BlockEntity).save({
    id: nanoid(),
    interKey: key2,
    workspaceId: nanoid(),
    storyId: nanoid(),
    parentId: nanoid(),
    parentTable: BlockParentType.BLOCK,
    type: 'dbt' as BlockType,
    content: { type: 'source' },
  })

  const res = await translate(
    `select * from {{dbt:${key1}}} where id = ( select id from {{ dbt: ${key2} }} )`,
  )

  await getRepository(BlockEntity).delete([block1.id, block2.id])

  t.is(res, `select * from ref('${key1}') where id = ( select id from source('${key2}') )`)
})
