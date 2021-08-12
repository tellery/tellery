import test from 'ava'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'
import _ from 'lodash'
import { register } from '../../src/core/block'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { DbtBlock } from '../../src/core/block/dbt'
import { QuestionBlock } from '../../src/core/block/question'
import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { DbtService } from '../../src/services/dbt'
import { BlockParentType, BlockType } from '../../src/types/block'
import { DbtMetadata } from '../../src/types/dbt'
import { set, uuid } from '../testutils'
import { BlockOperation } from '../../src/core/block/operation'

const dbtService = new DbtService(new FakePermission())

test.before(async () => {
  await createDatabaseCon()
  register(BlockType.DBT, DbtBlock)
  register(BlockType.QUESTION, QuestionBlock)
})

function generateDbtBlock(metadata: DbtMetadata, workspaceId: string) {
  const id = nanoid()
  const entity = new BlockEntity()
  Object.assign(entity, {
    id,
    interKey: id,
    workspaceId,
    storyId: 'test',
    parentId: workspaceId,
    parentTable: BlockParentType.WORKSPACE,
    type: BlockType.DBT,
    content: {
      ...metadata,
      title: [[`dbt.${metadata.name}`]],
    },
    children: [],
    alive: true,
  })
  return entity
}

function generateQuestionOp(title: string, sql: string): [string, any] {
  const id = nanoid()
  return [
    id,
    {
      id,
      type: BlockType.QUESTION,
      storyId: 'test',
      parentId: 'test',
      parentTable: BlockParentType.BLOCK,
      content: {
        title: [[title]],
        sql,
      },
      alive: true,
      createdById: uuid(),
    },
  ]
}

const metadataSourceEvent: DbtMetadata = {
  name: 'event',
  description: 'just event table',
  relationName: 'test.event',
  compiledSql: '?',
  type: 'source',
  materialized: 'table',
  sourceName: 'event',
}

const metadataSourceUser: DbtMetadata = {
  name: 'user',
  description: 'user table',
  relationName: 'test.user',
  compiledSql: '?',
  type: 'source',
  materialized: 'table',
  sourceName: 'user',
}

const metadataSourceOrder: DbtMetadata = {
  name: 'order',
  description: 'order table',
  relationName: 'test.order',
  compiledSql: '?',
  type: 'source',
  materialized: 'table',
  sourceName: 'order',
}

const metadataModelDau: DbtMetadata = {
  name: 'dau',
  description: 'dau',
  relationName: '',
  rawSql: `select dt as dt, count(distinct distinct_id) as dau
  from
  	(select distinct_id, dt from {{ ref("event") }}) e
    join
	(select uid from {{ ref("user") }}) u
	on u.uid = e.distinct_id`,
  compiledSql: `select dt as dt, count(distinct distinct_id) as dau
  from
  	(select distinct_id, dt from test.events) e
    join
	(select uid from test.user) u
	on u.uid = e.distinct_id`,
  type: 'model',
  materialized: 'table',
}

test.serial('list current dbt blocks', async (t) => {
  // create blocks first
  const workspaceId = nanoid()
  const entities = _([metadataSourceEvent, metadataSourceUser, metadataModelDau])
    .map((e) => generateDbtBlock(e, workspaceId))
    .value()
  await getRepository(BlockEntity).save(entities)

  const loadedBlocks = await dbtService.listCurrentDbtBlocks(workspaceId)

  t.is(loadedBlocks.length, 3)
  await getRepository(BlockEntity).delete(_(entities).map('id').value())
})

test('push exported metadata', async (t) => {
  // create blocks first
  const workspaceId = nanoid()
  const entities = _([metadataSourceEvent, metadataModelDau])
    .map((e) => generateDbtBlock(e, workspaceId))
    .value()
  await getRepository(BlockEntity).save(entities)

  const [dbtSourceId, dbtModelId] = _(entities).map('id').value()

  // use operation to create question, to correctly generate links
  const [anotherParentQuestionId, anotherParentQuestionOp] = generateQuestionOp(
    'parent',
    'select 1',
  )
  const [children1Id, children1Op] = generateQuestionOp(
    'children 1',
    `select * from {{ ${dbtSourceId} }}`,
  )
  const [children2Id, children2Op] = generateQuestionOp(
    'children 2',
    `select * from {{ ${dbtModelId} }}`,
  )
  const [children3Id, children3Op] = generateQuestionOp(
    'children 3',
    `select * from {{ ${children1Id} }} join {{ ${anotherParentQuestionId} }}`,
  )

  await getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), workspaceId, manager)
    await set(op, anotherParentQuestionId, anotherParentQuestionOp, [])
    await set(op, children1Id, children1Op, [])
    await set(op, children2Id, children2Op, [])
    await set(op, children3Id, children3Op, [])
  })

  const exportedMeta = await dbtService.loadAllDbtBlockDescendent(workspaceId)
  t.is(exportedMeta.length, 3)
  t.deepEqual(_(exportedMeta).sortBy('name').value(), [
    {
      name: 'children_1',
      sql: "select * from {{ source('event', 'event') }}",
    },
    {
      name: 'children_2',
      sql: "select * from {{ ref('dau') }}",
    },
    {
      name: 'children_3',
      sql: `select * from {{ ref('children_1') }} join tellery_transclusion.${anotherParentQuestionId}`,
    },
  ])
  await getRepository(BlockEntity).delete([
    dbtSourceId,
    dbtModelId,
    anotherParentQuestionId,
    children1Id,
    children2Id,
    children3Id,
  ])
})

test('update dbt blocks', async (t) => {
  const workspaceId = nanoid()
  // create blocks first
  const entities = _([metadataSourceUser, metadataSourceEvent, metadataSourceOrder])
    .map((e) => generateDbtBlock(e, workspaceId))
    .value()
  await getRepository(BlockEntity).save(entities)

  const newMetadata = [
    // delete source order
    // keep source event
    metadataSourceEvent,
    // modify metadata_source_user
    { ...metadataSourceUser, description: 'user table!!' },
    // insert model dau
    metadataModelDau,
  ]

  await dbtService.updateDbtBlocksByMetadata(workspaceId, 'test', newMetadata)
  const newBlocks = await dbtService.listCurrentDbtBlocks(workspaceId)
  const newBlockNames = _(newBlocks)
    .map((b) => _.get(b, 'content.name'))
    .value()
  t.is(newBlocks.length, 3)
  t.deepEqual(
    _.get(
      newBlocks.find((b) => _.get(b, 'content.name') === 'event'),
      'content',
    ),
    {
      ...metadataSourceEvent,
      title: [[metadataSourceEvent.name]],
    },
  )
  t.false(newBlockNames.includes('order'))
  t.truthy(newBlockNames.includes('dau'))
  t.truthy(
    _.get(
      newBlocks.find((b) => _.get(b, 'content.name') === 'user'),
      'content.description',
    ) === 'user table!!',
  )

  await getRepository(BlockEntity).delete(
    _([...entities, ...newBlocks])
      .map('id')
      .uniq()
      .value(),
  )
})
