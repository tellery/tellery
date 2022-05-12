import '../../../src/core/block/init'

import test from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { BlockParentType, BlockType } from '../../../src/types/block'
import { createDatabaseCon } from '../../../src/clients/db/orm'
import BlockEntity from '../../../src/entities/block'
import { translateSmartQuery } from '../../../src/core/translator/smartQuery'
import { stringCompare, queryBuilderContent, queryBuilderSpec } from '../../testutils'
import { SmartQueryExecution } from '../../../src/types/queryBuilder'

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
    content: queryBuilderContent as object,
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
    content: queryBuilderContent as object,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution: SmartQueryExecution = {
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
    filters: { operator: 'and', operands: [] },
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT case when cost > 10 then 'high' else 'low' AS \`costHigh\`, to_date(\`dt\`) AS \`dt byDate\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} GROUP BY 1, 2 ORDER BY 2`,
  )
})

test('smart query sql assemble without order by', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent as object,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution: SmartQueryExecution = {
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

test('smart query sql assemble without groupby', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent as object,
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
    content: queryBuilderContent as object,
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

test('smart query sql assemble with condition', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent as object,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution: SmartQueryExecution = {
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
    filters: {
      operator: 'and',
      operands: [
        {
          operator: 'or',
          operands: [
            {
              fieldName: 'cost',
              fieldType: 'DECIMAL',
              func: 'LT',
              args: ['1000'],
            },
            {
              fieldName: 'uid',
              fieldType: 'VARCHAR',
              func: 'NE',
              args: ['123123123'],
            },
          ],
        },
        {
          fieldName: 'dt',
          fieldType: 'TIMESTAMP',
          func: 'IS_BETWEEN',
          args: ['2020-01-01', '2020-03-01'],
        },
        {
          fieldName: 'cost',
          fieldType: 'DECIMAL',
          func: 'IS_NOT_NULL',
          args: [],
        },
      ],
    },
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} WHERE ((\`cost\` < 1000 OR \`uid\` != '123123123') AND \`dt\` BETWEEN timestamp('2020-01-01') AND timestamp('2020-03-01') AND \`cost\` IS NOT NULL) GROUP BY 1, 2 ORDER BY 1`,
  )
})

test('empty filter', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent as object,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution: SmartQueryExecution = {
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
    filters: { operator: 'and', operands: [] },
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT case when cost > 10 then 'high' else 'low' AS \`costHigh\`, to_date(\`dt\`) AS \`dt byDate\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} GROUP BY 1, 2 ORDER BY 2`,
  )
})

test('IN filter', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()

  await getRepository(BlockEntity).save({
    id: queryBuilderId,
    workspaceId: 'test',
    interKey: queryBuilderId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: queryBuilderContent as object,
    type: BlockType.QUERY_BUILDER,
    children: [],
    alive: true,
  })

  const smartQueryExecution: SmartQueryExecution = {
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
    filters: {
      operator: 'and',
      operands: [
        {
          operator: 'or',
          operands: [
            {
              fieldName: 'cost',
              fieldType: 'DECIMAL',
              func: 'LT',
              args: ['1000'],
            },
            {
              fieldName: 'uid',
              fieldType: 'VARCHAR',
              func: 'NE',
              args: ['123123123'],
            },
          ],
        },
        {
          fieldName: 'uid',
          fieldType: 'VARCHAR',
          func: 'IN',
          args: ['123', '456', '789'],
        },
        {
          fieldName: 'cost',
          fieldType: 'DECIMAL',
          func: 'IS_NOT_NULL',
          args: [],
        },
      ],
    },
  }

  const sql = await translateSmartQuery(smartQueryExecution, queryBuilderSpec)
  await getRepository(BlockEntity).delete([queryBuilderId])
  stringCompare(
    t,
    sql,
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} WHERE ((\`cost\` < 1000 OR \`uid\` != '123123123') AND \`uid\` IN ('123', '456', '789') AND \`cost\` IS NOT NULL) GROUP BY 1, 2 ORDER BY 1`,
  )
})
