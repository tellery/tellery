import '../../src/core/block/init'

import test from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import BlockEntity from '../../src/entities/block'
import { CyclicTransclusionError } from '../../src/error/error'
import { QuestionService } from '../../src/services/question'
import { BlockParentType, BlockType } from '../../src/types/block'

const questionService = new QuestionService()

test.before(async () => {
  await createDatabaseCon()
})

test('assembleSql', async (t) => {
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

  const sqlBody = await questionService.assembleSql(sql)

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
    await questionService.assembleSql(sql)
    t.fail()
  } catch (e) {
    if (!(e instanceof CyclicTransclusionError)) {
      t.fail(e)
    }
  } finally {
    await getRepository(BlockEntity).delete([blockId1, blockId2])
  }
})
