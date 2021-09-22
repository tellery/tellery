import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import BlockEntity from '../../../src/entities/block'
import { CyclicTransclusionError } from '../../../src/error/error'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { buildSqlFromGraph, sqlMacro, translate } from '../../../src/core/translator'
import { DirectedGraph } from '../../../src/utils/directedgraph'
import { stringCompare } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('translate', async (t) => {
  const storyId = nanoid()
  const sqlBlockId = nanoid()
  const dbtBlockId = nanoid()
  await getRepository(BlockEntity).save({
    id: sqlBlockId,
    workspaceId: 'test',
    interKey: sqlBlockId,
    parentId: 'test',
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [[nanoid()]],
      sql: `select * from order_x`,
    },
    type: BlockType.SQL,
    children: [],
    alive: true,
  })
  await getRepository(BlockEntity).save({
    id: dbtBlockId,
    workspaceId: 'test',
    interKey: dbtBlockId,
    parentId: 'test',
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      materialized: 'table',
      relationName: 'table2',
    },
    type: BlockType.DBT,
    children: [],
    alive: true,
  })
  const sql = `select * from {{${sqlBlockId} as t1}} left join {{${dbtBlockId} as t2}}`

  const sqlBody = await translate(sql, {}, 500)

  stringCompare(
    t,
    sqlBody,
    `WITH t1 AS ( select * from order_x ), t2 AS ( SELECT * from table2 ) select * from t1 left join t2 LIMIT 500`,
  )
  await getRepository(BlockEntity).delete([sqlBlockId, dbtBlockId])
})

test('translate duplicate references', async (t) => {
  const storyId = nanoid()
  const sqlBlockId = nanoid()
  await getRepository(BlockEntity).save({
    id: sqlBlockId,
    workspaceId: 'test',
    interKey: sqlBlockId,
    parentId: 'test',
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [[nanoid()]],
      sql: `select * from order_x`,
    },
    type: BlockType.SQL,
    children: [],
    alive: true,
  })

  const sql = `select * from {{${sqlBlockId} as t1}} left join {{${sqlBlockId} as t2}}`

  const sqlBody = await translate(sql, {})

  stringCompare(
    t,
    sqlBody,
    `WITH t1 AS ( select * from order_x ), t2 AS ( select * from order_x ) select * from t1 left join t2 LIMIT 1000`,
  )
  await getRepository(BlockEntity).delete([sqlBlockId])
})

test('cyclic assemble', async (t) => {
  const storyId = nanoid()
  const blockId1 = nanoid()
  const blockId2 = nanoid()

  await getRepository(BlockEntity).save({
    id: blockId1,
    workspaceId: 'test',
    interKey: blockId1,
    parentId: 'test',
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [[nanoid()]],
      sql: `select * from {{${blockId2}}}`,
    },
    type: BlockType.SQL,
    children: [],
    alive: true,
  })

  await getRepository(BlockEntity).save({
    id: blockId2,
    workspaceId: 'test',
    interKey: blockId2,
    parentId: 'test',
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [[nanoid()]],
      sql: `select * from {{${blockId1}}}`,
    },
    type: BlockType.SQL,
    children: [],
    alive: true,
  })

  const sql = `select * from {{${blockId1} as t1}}`

  try {
    await translate(sql, {})
    t.fail()
  } catch (e: any) {
    if (!(e instanceof CyclicTransclusionError)) {
      t.fail(e.toString())
    }
  } finally {
    await getRepository(BlockEntity).delete([blockId1, blockId2])
  }
})

test('sqlMacro', (t) => {
  const sql = `select * from {{blockId1 as t1}} left join {{blockId2}} p on t1.a = p.a union all {{ blockId3 }} order by c`
  const { mainBody, subs } = sqlMacro(sql)
  t.deepEqual(
    mainBody,
    `select * from t1 left join ${subs[1].alias} p on t1.a = p.a union all ${subs[2].alias} order by c`,
  )
  t.deepEqual(_(subs).map('blockId').value(), ['blockId1', 'blockId2', 'blockId3'])
  t.deepEqual(subs[0].alias, 't1')
})

test('buildSqlFromGraph', async (t) => {
  const bid = nanoid()
  const bid2 = nanoid()
  const bid3 = nanoid()
  const g = new DirectedGraph<{
    subs: { blockId: string; alias: string }[]
    mainBody: string
  }>()
  g.addNode('root', {
    subs: [{ blockId: bid, alias: 't1' }],
    mainBody: 'select * from t1',
  })
  g.addNode(bid, {
    subs: [{ blockId: bid2, alias: 't2' }],
    mainBody: 'select * from t2',
  })
  g.addNode(bid2, {
    subs: [{ blockId: bid3, alias: 't3' }],
    mainBody: 'select * from t3',
  })
  g.addNode(bid3, {
    subs: [],
    mainBody:
      'WITH RECURSIVE result AS ( SELECT id, children FROM blocks WHERE id = a UNION ALL SELECT origin.id, origin.children FROM result JOIN blocks origin ON origin.id = ANY(result.children)) updateSql',
  })
  g.addEdge('root', bid)
  g.addEdge(bid, bid2)
  g.addEdge(bid2, bid3)
  const sqlStack = buildSqlFromGraph(g)

  stringCompare(
    t,
    sqlStack,
    'WITH t1 AS ( WITH t2 AS ( WITH t3 AS ( WITH RECURSIVE result AS ( SELECT id, children FROM blocks WHERE id = a UNION ALL SELECT origin.id, origin.children FROM result JOIN blocks origin ON origin.id = ANY(result.children)) updateSql ) select * from t3 ) select * from t2 ) select * from t1',
  )
})

test('withLimit', async (t) => {
  const sql = 'select * from test'
  stringCompare(t, await translate(sql, {}), 'select * from test LIMIT 1000')

  const sql2 = 'select * from test'
  stringCompare(t, await translate(sql2, {}, 10), 'select * from test LIMIT 10')

  const sql3 = 'select * from test limit 20'
  stringCompare(t, await translate(sql3, {}, 10), 'select * from test limit 20')

  const sql4 = 'select * from test LIMIT 20'
  stringCompare(t, await translate(sql4, {}, 10), 'select * from test LIMIT 20')
})
