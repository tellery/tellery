import '../../../src/core/block/init'

import test from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { BlockParentType, BlockType } from '../../../src/types/block'
import { createDatabaseCon } from '../../../src/clients/db/orm'
import BlockEntity from '../../../src/entities/block'
import { translateExplorationToSql } from '../../../src/core/translator/exploration'
import { stringCompare } from '../../testutils'

const objConverter = (t: { [key: string]: { [key: string]: string } }) =>
  new Map(
    Object.entries(t).flatMap(([k, v]) => {
      const vMap = new Map(Object.entries(v))
      return k.split(',').map((subKey: string) => [subKey, vMap])
    }),
  )
const metricSpec = {
  identifier: '`?`',
  stringLiteral: "'?'",
  aggregation: objConverter({
    'CHAR,VARCHAR,LONGVARCHAR,DATE,TIME,TIMESTAMP': {
      count: 'count(?)',
      countDistinct: 'count(distinct ?)',
    },
    'TINYINT,SMALLINT,INTERGER,FLOAT,REAL,DOUBLD,NUMERIC,DECIMAL': {
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

test.before(async () => {
  await createDatabaseCon()
})

test('exploration sql assemble', async (t) => {
  const storyId = nanoid()
  const metricId = nanoid()

  await getRepository(BlockEntity).save({
    id: metricId,
    workspaceId: 'test',
    interKey: metricId,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [['metric1']],
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
      measurements: {
        mid1: {
          name: 'active_user',
          fieldName: 'uid',
          type: 'VARCHAR',
          func: 'countDistinct',
        },
        mid2: {
          name: 'avg_cost',
          fieldName: 'cost',
          type: 'DECIMAL',
          func: 'avg',
        },
        mid3: {
          name: 'total_visit',
          fieldName: 'visit',
          type: 'INTEGER',
          func: 'sum',
        },
        mid4: {
          name: 'visit_p95',
          rawSql: 'percentile(visit, 0.95)',
        },
      },
    },
    type: BlockType.METRIC,
    children: [],
    alive: true,
  })

  const explorationExecution = {
    metricId,
    measurementIds: ['mid1', 'mid4'],
    dimensions: [
      {
        name: 'dt byDate',
        fieldName: 'dt',
        type: 'TIMESTAMP',
        func: 'byDate',
      },
      {
        name: 'costHigh',
        rawSql: "case when cost > 10 then 'high' else 'low'",
      },
    ],
  }

  const sql = await translateExplorationToSql(explorationExecution, metricSpec)
  await getRepository(BlockEntity).delete([metricId])
  stringCompare(
    t,
    sql,
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${metricId} }} GROUP BY 1, 2`,
  )
})
