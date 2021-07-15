import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import BlockEntity from '../../../src/entities/block'
import { CyclicTransclusionError } from '../../../src/error/error'
import { BlockParentType, BlockType } from '../../../src/types/block'
import {
  buildSqlFromGraph,
  buildSqlFromGraphWithStack,
  sqlMacro,
  translate,
} from '../../../src/core/translator/question'
import { DirectedGraph } from '../../../src/utils/directedgraph'

test.before(async () => {
  await createDatabaseCon()
})

test('question translate', async (t) => {
  const storyId = nanoid()
  const blockId = nanoid()
  await getRepository(BlockEntity).save({
    id: blockId,
    workspaceId: 'test',
    interKey: blockId,
    parentId: 'test',
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [[nanoid()]],
      sql: `select * from order_x`,
    },
    type: BlockType.QUESTION,
    children: [],
    alive: true,
  })
  const refId = `${blockId}`
  const sql = `select * from {{${refId} as t1}}`

  const sqlBody = await translate(sql)

  t.deepEqual(
    sqlBody,
    `WITH
  t1 AS (
    select * from order_x
  )
select * from t1`,
  )
  await getRepository(BlockEntity).delete(blockId)
})

test('question cyclic assemble', async (t) => {
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
    type: BlockType.QUESTION,
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
    type: BlockType.QUESTION,
    children: [],
    alive: true,
  })

  const sql = `select * from {{${blockId1} as t1}}`

  try {
    await translate(sql)
    t.fail()
  } catch (e) {
    if (!(e instanceof CyclicTransclusionError)) {
      t.fail(e)
    }
  } finally {
    await getRepository(BlockEntity).delete([blockId1, blockId2])
  }
})

test('question sqlMacro', (t) => {
  const sql = `select * from {{blockId1 as t1}} left join {{blockId2}} p on t1.a = p.a union all {{ blockId3 }} order by c`
  const { mainBody, subs } = sqlMacro(sql)
  t.deepEqual(
    mainBody,
    `select * from t1 left join ${subs[1].alias} p on t1.a = p.a union all ${subs[2].alias} order by c`,
  )
  t.deepEqual(_(subs).map('blockId').value(), ['blockId1', 'blockId2', 'blockId3'])
  t.deepEqual(subs[0].alias, 't1')
})

test('question buildSqlFromGraph', async (t) => {
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
  const sqlCycle = buildSqlFromGraph('root', g)
  const sqlStack = buildSqlFromGraphWithStack(g)
  t.is(sqlCycle, sqlStack)
})
