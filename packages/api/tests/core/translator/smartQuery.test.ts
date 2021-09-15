import '../../../src/core/block/init'

import test from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { BlockParentType, BlockType } from '../../../src/types/block'
import { createDatabaseCon } from '../../../src/clients/db/orm'
import BlockEntity from '../../../src/entities/block'
import { translateSmartQuery } from '../../../src/core/translator/smartQuery'
import { stringCompare } from '../../testutils'

const objConverter = (t: { [key: string]: { [key: string]: string } }) =>
  new Map(
    Object.entries(t).flatMap(([k, v]) => {
      const vMap = new Map(Object.entries(v))
      return k.split(',').map((subKey: string) => [subKey, vMap])
    }),
  )
const queryBuilderSpec = {
  identifier: '`?`',
  stringLiteral: "'?'",
  aggregation: objConverter({
    'CHAR,VARCHAR,LONGVARCHAR,DATE,TIME,TIMESTAMP': {
      count: 'count(?)',
      countDistinct: 'count(distinct ?)',
    },
    'TINYINT,SMALLINT,INTEGER,FLOAT,REAL,DOUBLE,NUMERIC,DECIMAL': {
      sum: 'sum(?)',
      avg: 'avg(?)',
      min: 'min(?)',
      max: 'max(?)',
      median: 'percentile(?, 0.5)',
      std: 'stddev(?)',
    },
  }),
  bucketization: objConverter({
    'DATE,TIME,TIMESTAMP': {
      byYear: 'year(?)',
      byMonth: "date_format(?, 'yyyy-MM')",
      byWeek: 'weekofyear(?)',
      byDate: 'to_date(?)',
    },
  }),
}

const queryBuilderContent = {
  title: [['qb1']],
  sql: 'select uid, visit, dt, cost from test',
  fields: [
    {
      name: 'uid',
      type: 'VARCHAR',
    },
    {
      name: 'visit',
      type: 'INTEGER',
    },
    {
      name: 'dt',
      type: 'TIMESTAMP',
    },
    {
      name: 'cost',
      type: 'DECIMAL',
    },
  ],
  metrics: {
    mid1: {
      name: 'active_user',
      fieldName: 'uid',
      fieldType: 'VARCHAR',
      func: 'countDistinct',
    },
    mid2: {
      name: 'avg_cost',
      fieldName: 'cost',
      fieldType: 'DECIMAL',
      func: 'avg',
    },
    mid3: {
      name: 'total_visit',
      fieldName: 'visit',
      fieldType: 'INTEGER',
      func: 'sum',
    },
    mid4: {
      name: 'visit_p95',
      rawSql: 'percentile(visit, 0.95)',
    },
  },
}

test.before(async () => {
  await createDatabaseCon()
})

test('smart query sql assemble', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution = {
    queryBuilderId,
    metricIds: ['mid1', 'mid4'],
    dimensions: [
      {
        name: 'dt byDate',
        fieldName: 'dt',
        fieldType: 'TIMESTAMP',
        func: 'byDate',
      },
      {
        name: 'costHigh',
        rawSql: "case when cost > 10 then 'high' else 'low'",
      },
    ],
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} GROUP BY 1, 2 ORDER BY 1`,
  )
})

test('smart query sql assemble (order by index)', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution = {
    queryBuilderId,
    metricIds: ['mid1', 'mid4'],
    dimensions: [
      {
        name: 'costHigh',
        rawSql: "case when cost > 10 then 'high' else 'low'",
      },
      {
        name: 'dt byDate',
        fieldName: 'dt',
        fieldType: 'TIMESTAMP',
        func: 'byDate',
      },
    ],
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT case when cost > 10 then 'high' else 'low' AS \`costHigh\`, to_date(\`dt\`) AS \`dt byDate\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} GROUP BY 1, 2 ORDER BY 2`,
  )
})

test('smart query sql without dimension and metric', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution = {
    queryBuilderId,
    metricIds: [],
    dimensions: [],
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(t, sql, `SELECT * FROM {{ ${queryBuilderId} }}`)
})

test('smart query sql assemble without orderby', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution = {
    queryBuilderId,
    metricIds: ['mid1', 'mid4'],
    dimensions: [
      {
        name: 'costHigh',
        rawSql: "case when cost > 10 then 'high' else 'low'",
      },
    ],
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} GROUP BY 1`,
  )
})

test('smart query sql assemble without groupBy', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution = {
    queryBuilderId,
    metricIds: ['mid1', 'mid4'],
    dimensions: [],
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }}`,
  )
})
