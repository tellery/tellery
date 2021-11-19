import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakeSocketManager } from '../../src/clients/socket/fake'
import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { BlockService } from '../../src/services/block'
import { OperationService } from '../../src/services/operation'
import { BlockParentType, BlockType } from '../../src/types/block'
import { defaultPermissions } from '../../src/types/permission'
import {
  mockBlocks,
  mockStories,
  uuid,
  queryBuilderSpec,
  queryBuilderContent,
  stringCompare,
  mockQuestions,
} from '../testutils'

const blockService = new BlockService(new FakePermission())
const operationService = new OperationService(new FakePermission(), new FakeSocketManager())

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
    },
    type: BlockType.SMART_QUERY,
    children: [],
    alive: true,
  })

  await blockService.downgradeQueryBuilder(
    'user1',
    'test',
    queryBuilderId,
    queryBuilderSpec,
    operationService,
  )

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
    `SELECT to_date(\`dt\`) AS \`dt byDate\`, case when cost > 10 then 'high' else 'low' AS \`costHigh\`, count(distinct \`uid\`) AS \`active_user\`, percentile(visit, 0.95) AS \`visit_p95\` FROM {{ ${queryBuilderId} }} WHERE ((\`cost\` < 1000 OR \`uid\` != '123123123') AND \`dt\` BETWEEN timestamp('2020-01-01') AND timestamp('2020-03-01') AND \`cost\` IS NOT NULL) GROUP BY 1, 2 ORDER BY 1`,
  )
  t.deepEqual(blocksMap[smartQuery1Id].content.title, [['test 1']])
  t.deepEqual(blocksMap[smartQuery2Id].content.title, [['test 2']])
  await getRepository(BlockEntity).delete([queryBuilderId, smartQuery1Id, smartQuery2Id])
})

test('export/import handle content', async (t) => {
  const [id1, newId1, id2, newId2, id3, newId3] = _.range(6).map(() => nanoid())
  const idMap = new Map([
    [id1, newId1],
    [id2, newId2],
    [id3, newId3],
  ])

  const invariantTitleContent = {
    title: [['test']],
  }
  const titleContent = {
    title: [['', [['r', 's', id1]]]],
  }
  const sqlContent = {
    sql: `select * from {{${id2}}} union {{${id3}}} union {{${id2}}}`,
  }

  t.deepEqual(blockService.handleContent(invariantTitleContent, idMap), invariantTitleContent)
  t.deepEqual(blockService.handleContent(titleContent, idMap), {
    title: [['', [['r', 's', newId1]]]],
  })
  t.deepEqual(blockService.handleContent(sqlContent, idMap), {
    sql: `select * from {{${newId2}}} union {{${newId3}}} union {{${newId2}}}`,
  })
})

test('import handle id and content', async (t) => {
  const [story1, story2] = await mockStories(2)
  const [block1, block2] = await mockBlocks(2, story1.id)
  const [block3] = await mockBlocks(1, story2.id)
  const [question1] = await mockQuestions(1, story1.id)
  const [question2] = await mockQuestions(1, story2.id)
  story1.children = [block1.id, block2.id, question1.id]
  story2.children = [block3.id, question2.id]
  _.set(block1.content, 'title', [['test story 1']])
  _.set(block2.content, 'title', [['', [['r', 's', story2.id]]]])
  _.set(block3.content, 'title', [['test story 2']])
  _.set(question1.content, 'sql', 'select * from test')
  _.set(question2.content, 'sql', `select * from {{${question1.id}}}`)
  const allBlocks = [story1, story2, block1, block2, block3, question1, question2]
  await Promise.all(allBlocks.map((i) => i.save()))
  const exported = await blockService.exportStories('user1', 'test', [story1.id, story2.id])
  // check exported
  const idMap = new Map(allBlocks.map((i) => [i.id, nanoid()]))
  const imported = exported.map((b) => blockService.explodeExportedBlock('user1', 'test', b, idMap))
  t.deepEqual(imported.find((i) => i.id === idMap.get(story1.id))?.parentId, 'test')
  t.deepEqual(
    imported.find((x) => x.id === idMap.get(story1.id))?.children,
    story1.children.map((id) => idMap.get(id) ?? ''),
  )
  t.deepEqual(imported.find((x) => x.id === idMap.get(block1.id))?.content?.title, [
    ['test story 1'],
  ])
  t.deepEqual(imported.find((x) => x.id === idMap.get(block1.id))?.parentId, idMap.get(story1.id))
  t.deepEqual(imported.find((x) => x.id === idMap.get(block3.id))?.parentId, idMap.get(story2.id))
  t.deepEqual(imported.find((x) => x.id === idMap.get(block1.id))?.createdById, 'user1')
  t.deepEqual(imported.find((x) => x.id === idMap.get(block2.id))?.content?.title, [
    ['', [['r', 's', idMap.get(story2.id)]]],
  ])
  t.deepEqual(imported.find((x) => x.id === idMap.get(block3.id))?.content?.title, [
    ['test story 2'],
  ])
  t.deepEqual(
    imported.find((x) => x.id === idMap.get(question1.id))?.content?.sql,
    'select * from test',
  )
  t.deepEqual(
    imported.find((x) => x.id === idMap.get(question1.id))?.parentId,
    idMap.get(story1.id),
  )
  t.deepEqual(
    imported.find((x) => x.id === idMap.get(question2.id))?.content?.sql,
    `select * from {{${idMap.get(question1.id)}}}`,
  )
  await getRepository(BlockEntity).delete(_(allBlocks).map('id').value())
})

test('import write to db', async (t) => {
  const [story1, story2] = await mockStories(2)
  const [block1, block2] = await mockBlocks(2, story1.id)
  const [block3] = await mockBlocks(1, story2.id)
  const [question1] = await mockQuestions(1, story1.id)
  const [question2] = await mockQuestions(1, story2.id)
  story1.children = [block1.id, block2.id, question1.id]
  story2.children = [block3.id, question2.id]
  _.set(block1.content, 'title', [['test story 1']])
  _.set(block2.content, 'title', [['', [['r', 's', story2.id]]]])
  _.set(block3.content, 'title', [['test story 2']])
  _.set(question1.content, 'sql', 'select * from test')
  _.set(question2.content, 'sql', `select * from {{${question1.id}}}`)
  const allBlocks = [story1, story2, block1, block2, block3, question1, question2]
  await Promise.all(allBlocks.map((i) => i.save()))
  const exported = await blockService.exportStories('user1', 'test', [story1.id, story2.id])
  // check exported
  const importedIds = await blockService.importStories('user1', 'test', exported)
  const blocks = await getRepository(BlockEntity).findByIds(importedIds)
  const newStory1 = blocks.find(
    (i) => i.type === BlockType.STORY && (i.children ?? []).length === 3,
  )
  const newStory2 = blocks.find(
    (i) => i.type === BlockType.STORY && (i.children ?? []).length === 2,
  )
  t.not(newStory1, undefined)
  t.not(newStory2, undefined)
  t.is(newStory1!.parentId, 'test')
  t.is(newStory2!.parentId, 'test')
  const newStory1Children = blocks.filter((i) => i.parentId === newStory1!.id)
  t.is(newStory1Children.length, 3)
  await getRepository(BlockEntity).delete([..._(allBlocks).map('id').value(), ...importedIds])
})
