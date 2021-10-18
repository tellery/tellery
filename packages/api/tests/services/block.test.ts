import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { BlockService } from '../../src/services/block'
import { BlockParentType, BlockType } from '../../src/types/block'
import { defaultPermissions } from '../../src/types/permission'
import {
  mockBlocks,
  mockStories,
  uuid,
  queryBuilderSpec,
  queryBuilderContent,
  stringCompare,
} from '../testutils'

const blockService = new BlockService(new FakePermission())

test.before(async () => {
  await createDatabaseCon()
})

test('mgetBlocks', async (t) => {
  const sid = nanoid()
  const blocks = await mockBlocks(50, sid)

  const entity = new BlockEntity()
  entity.id = sid
  entity.interKey = sid
  entity.workspaceId = 'test'
  entity.storyId = sid
  entity.parentId = nanoid()
  entity.parentTable = BlockParentType.WORKSPACE
  entity.type = BlockType.STORY
  entity.content = { title: [[nanoid()]] }
  entity.children = _(blocks).map('id').value()
  entity.permissions = defaultPermissions
  entity.alive = true
  await getRepository(BlockEntity).save(entity)

  const res = await blockService.mget('', '', _(blocks).map('id').value())

  t.is(res.length, 50)
  await getRepository(BlockEntity).delete(_(blocks).map('id').value())
})

test('mgetBlock without permissions', async (t) => {
  const sid = nanoid()
  const blocks = await mockBlocks(2, sid)

  // not alive
  blocks[1].alive = false
  await blocks[1].save()

  const res = await blockService.mget('', 'test', _(blocks).map('id').value())

  // not alive
  const deleted = _(res).find((r) => r.id === blocks[1].id)
  t.is(deleted?.alive, false)
  t.deepEqual(deleted?.content, {})
})

test('listAccessibleBlocksByStoryId with alive false blocks', async (t) => {
  const [story] = await mockStories(1, 'test')
  const [block1, block2] = await mockBlocks(2, story.id)

  // set children
  story.children = [block1.id, block2.id]
  await story.save()

  // update block alive
  block1.alive = false
  await block1.save()

  const blocks1 = await blockService.listAccessibleBlocksByStoryId(uuid(), 'test', story.id)
  t.is(blocks1.length, 3)

  story.children = [block1.id]
  await story.save()

  const blocks2 = await blockService.listAccessibleBlocksByStoryId(uuid(), 'test', story.id)
  t.is(blocks2.length, 2)
})

test('downgradeQueryBuilder', async (t) => {
  const storyId = nanoid()
  const queryBuilderId = nanoid()
  const smartQuery1Id = nanoid()
  const smartQuery2Id = nanoid()

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

  await getRepository(BlockEntity).save({
    id: smartQuery1Id,
    workspaceId: 'test',
    interKey: smartQuery1Id,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [['test 1']],
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
    },
    type: BlockType.SMART_QUERY,
    children: [],
    alive: true,
  })

  await getRepository(BlockEntity).save({
    id: smartQuery2Id,
    workspaceId: 'test',
    interKey: smartQuery2Id,
    parentId: storyId,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      title: [['test 2']],
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
                func: 'lt',
                args: ['1000'],
              },
              {
                fieldName: 'uid',
                fieldType: 'VARCHAR',
                func: 'ne',
                args: ['123123123'],
              },
            ],
          },
          {
            fieldName: 'dt',
            fieldType: 'TIMESTAMP',
            func: 'isBetween',
            args: ['2020-01-01', '2020-03-01'],
          },
          {
            fieldName: 'cost',
            fieldType: 'DECIMAL',
            func: 'isNotNull',
            args: [],
          },
        ],
      },
    },
    type: BlockType.SMART_QUERY,
    children: [],
    alive: true,
  })

  await blockService.downgradeQueryBuilder('user1', 'test', queryBuilderId, queryBuilderSpec)

  const res = await blockService.mget('user1', 'test', [
    queryBuilderId,
    smartQuery1Id,
    smartQuery2Id,
  ])

  const blocksMap = _(res).keyBy('id').value()

  t.deepEqual(_(res).map('type').value(), [BlockType.SQL, BlockType.SQL, BlockType.SQL])
  stringCompare(t, blocksMap[queryBuilderId].content.sql, queryBuilderContent.sql)
  stringCompare(
    t,
    blocksMap[smartQuery1Id].content.sql,
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} GROUP BY 1, 2 ORDER BY 1`,
  )
  stringCompare(
    t,
    blocksMap[smartQuery2Id].content.sql,
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} WHERE ((\`cost\` < 1000 OR \`uid\` != '123123123') AND \`dt\` IS BETWEEN timestamp('2020-01-01') AND timestamp('2020-03-01') AND \`cost\` IS NOT NULL) GROUP BY 1, 2 ORDER BY 1`,
  )
  t.deepEqual(blocksMap[smartQuery1Id].content.title, [['test 1']])
  t.deepEqual(blocksMap[smartQuery2Id].content.title, [['test 2']])
  await getRepository(BlockEntity).delete([queryBuilderId, smartQuery1Id, smartQuery2Id])
})
