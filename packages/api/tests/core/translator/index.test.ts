import '../../../src/core/block/init'

import test, { ExecutionContext } from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import BlockEntity from '../../../src/entities/block'
import { CyclicTransclusionError } from '../../../src/error/error'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { buildSqlFromGraph, sqlMacro, translate } from '../../../src/core/translator'
import { DirectedGraph } from '../../../src/utils/directedgraph'
import { Block, register } from '../../../src/core/block'
import { QuestionBlock } from '../../../src/core/block/question'

test.before(async () => {
  await createDatabaseCon()
})

class DBTBlock extends Block {
  getType() {
    return 'dbt' as BlockType
  }
}

test('translate', async (t) => {
  register('dbt' as BlockType, DBTBlock)

  const storyId = nanoid()
  const questionBlockId = nanoid()
  const dbtBlockId = nanoid()
  await getRepository(BlockEntity).save({
    id: questionBlockId,
    workspaceId: 'test',
    interKey: questionBlockId,
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
    type: 'dbt' as BlockType,
    children: [],
    alive: true,
  })
  const sql = `select * from {{${questionBlockId} as t1}} left join {{${dbtBlockId} as t2}}`

  const sqlBody = await translate(sql)

  stringCompare(
    t,
    sqlBody,
    `WITH t1 AS ( select * from order_x ), t2 AS ( select * from table2 ) select * from t1 left join t2`,
  )
  await getRepository(BlockEntity).delete([questionBlockId, dbtBlockId])
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

function stringCompare(t: ExecutionContext<any>, a: string, b: string) {
  const tags = [' ', '\n', '\t']

  const splitAndJoin = (str: string): string => {
    for (const tag of tags) {
      str = str.split(tag).join(' ')
    }
    return _(str).split(' ').compact().join(' ')
  }
  t.deepEqual(splitAndJoin(a), splitAndJoin(b))
}
