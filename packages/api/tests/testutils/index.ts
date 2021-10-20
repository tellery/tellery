import '../../src/core/block/init'

import _ from 'lodash'
import { ExecutionContext } from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { IOperation } from '../../src/core/operation/operation'
import BlockEntity from '../../src/entities/block'
import { BlockParentType, BlockType } from '../../src/types/block'
import { UserEntity } from '../../src/entities/user'
import { AccountStatus } from '../../src/types/user'
import { ThirdPartyConfigurationEntity } from '../../src/entities/thirdParty'

export function uuid(): string {
  const prefix = '942194da-d7db-4fbe-9887-3db5ef8c'
  return `${prefix}${_.random(1000, 9999, false)}`
}

export async function mockUsers(len: number): Promise<UserEntity[]> {
  const models = _(len)
    .range()
    .map(() => {
      const entity = new UserEntity()
      entity.username = nanoid()
      entity.email = `${nanoid()}@test.com`
      entity.avatar = nanoid()
      entity.password = nanoid()
      entity.status = AccountStatus.ACTIVE
      return entity
    })
    .value()

  return getRepository(UserEntity).save(models)
}

export async function mockStories(len: number, workspaceId?: string): Promise<BlockEntity[]> {
  const models = _(len)
    .range()
    .map(() => nanoid())
    .map((id) => {
      const entity = new BlockEntity()
      Object.assign(entity, {
        id,
        workspaceId: workspaceId ?? 'test',
        interKey: id,
        parentId: workspaceId ?? 'test',
        parentTable: BlockParentType.WORKSPACE,
        storyId: id,
        content: {
          title: [[nanoid()]],
        },
        type: BlockType.STORY,
        children: [],
        alive: true,
      })
      return entity
    })
    .value()

  return getRepository(BlockEntity).save(models)
}

export async function mockQuestions(
  len: number,
  storyId?: string,
  workspaceId?: string,
): Promise<BlockEntity[]> {
  const models = _(len)
    .range()
    .map(() => nanoid())
    .map((id) => {
      const entity = new BlockEntity()
      Object.assign(entity, {
        id,
        workspaceId: workspaceId ?? 'test',
        interKey: id,
        parentId: storyId ?? 'test',
        parentTable: BlockParentType.BLOCK,
        storyId: storyId ?? 'storyId',
        content: {
          title: [[nanoid()]],
          sql: 'select * from order limit 1',
        },
        type: BlockType.SQL,
        children: [],
        alive: true,
      })
      return entity
    })
    .value()

  return getRepository(BlockEntity).save(models)
}

export function dayBefore(offset: number): string {
  const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
  return d.toISOString().substring(0, 10)
}

export async function mockThoughts(
  len: number,
  uid?: string,
  workspaceId?: string,
): Promise<BlockEntity[]> {
  const models = _(len)
    .range()
    .map(() => nanoid())
    .map((id, offset) => {
      const entity = new BlockEntity()
      Object.assign(entity, {
        id,
        workspaceId: workspaceId ?? 'test',
        interKey: id,
        parentId: workspaceId ?? 'test',
        parentTable: BlockParentType.WORKSPACE,
        storyId: id,
        content: {
          date: dayBefore(offset),
        },
        type: BlockType.THOUGHT,
        children: [],
        alive: true,
        createdById: uid ?? uuid(),
      })
      return entity
    })
    .value()

  return getRepository(BlockEntity).save(models)
}

export async function mockBlocks(
  len: number,
  storyId?: string,
  workspaceId?: string,
): Promise<BlockEntity[]> {
  const models = _(len)
    .range()
    .map(() => {
      const entity = new BlockEntity()
      Object.assign(entity, {
        id: nanoid(),
        workspaceId: workspaceId ?? 'test',
        interKey: nanoid(),
        parentId: storyId ?? nanoid(),
        parentTable: BlockParentType.BLOCK,
        storyId: storyId ?? nanoid(),
        content: { title: [['hello world']] },
        type: BlockType.TEXT,
        children: [],
        alive: true,
      })
      return entity
    })
    .value()

  return getRepository(BlockEntity).save(models)
}

export async function mockSubBlocks(
  len: number,
  blockId: string,
  storyId: string,
): Promise<BlockEntity[]> {
  const models = _(len)
    .range()
    .map(() => {
      const entity = new BlockEntity()
      Object.assign(entity, {
        id: nanoid(),
        workspaceId: 'test',
        interKey: nanoid(),
        parentId: blockId,
        parentTable: BlockParentType.BLOCK,
        storyId,
        content: { title: [['hello world']] },
        type: BlockType.TEXT,
        children: [],
        alive: true,
      })
      return entity
    })
    .value()

  return getRepository(BlockEntity).save(models)
}

export async function set(
  operation: IOperation,
  id: string,
  args: any,
  path: string[],
): Promise<void> {
  const obj = await operation.entity(id)
  const res = await operation.set(obj, args, path)
  await operation.save(res, await operation.findInDB(id))
}

export async function update(
  operation: IOperation,
  id: string,
  args: any,
  path: string[],
): Promise<void> {
  const obj = await operation.entity(id)
  const res = await operation.update(obj, args, path)
  await operation.save(res, await operation.findInDB(id))
}

export async function remove(
  operation: IOperation,
  id: string,
  args: any,
  path: string[],
): Promise<void> {
  const obj = await operation.entity(id)
  const res = await operation.remove(obj, args, path)
  await operation.save(res, await operation.findInDB(id))
}

export async function setPermissions(
  operation: IOperation,
  id: string,
  args: any,
  path: string[],
): Promise<void> {
  const obj = await operation.entity(id)
  const res = await operation.setPermissions(obj, args, path)
  await operation.save(res, await operation.findInDB(id))
}

export async function updateIndex(
  operation: IOperation,
  id: string,
  operatorId: string,
  path: string[],
  flag: 'before' | 'after',
  targetId?: string,
): Promise<void> {
  const obj = await operation.entity(id)
  const res = await operation.updateIndex(obj, operatorId, path, flag, targetId)
  await operation.save(res, await operation.findInDB(id))
}

export async function createMetabaseSecret(host: string): Promise<void> {
  let tpc = await getRepository(ThirdPartyConfigurationEntity).findOne({ type: 'metabase' })
  if (!tpc) {
    tpc = new ThirdPartyConfigurationEntity()
    tpc.type = 'metabase'
    tpc.config = { secretMap: {} }
  }

  _.set(tpc, ['config', 'secretMap', host], nanoid())

  await tpc.save()
}

export function stringCompare(t: ExecutionContext<any>, a: string, b: string): void {
  const tags = [' ', '\n', '\t']

  const splitAndJoin = (str: string): string => {
    let currStr = str
    // eslint-disable-next-line no-restricted-syntax
    for (const tag of tags) {
      currStr = currStr.split(tag).join(' ')
    }
    return _(currStr).split(' ').compact().join(' ')
  }
  t.deepEqual(splitAndJoin(a), splitAndJoin(b))
}

const objConverter = (t: { [key: string]: { [key: string]: string } }) =>
  new Map(
    Object.entries(t).flatMap(([k, v]) => {
      const vMap = new Map(Object.entries(v))
      return k.split(',').map((subKey: string) => [subKey, vMap])
    }),
  )

export const queryBuilderSpec = {
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
  typeConversion: new Map(
    Object.entries({
      'TINYINT,SMALLINT,INTEGER,BIGINT,FLOAT,REAL,DOUBLE,NUMERIC,DECIMAL': '?',
      'CHAR,VARCHAR,LONGVARCHAR': "'?'",
      DATE: "date('?')",
      'TIME,TIMESTAMP': "timestamp('?')",
    }).flatMap(([k, v]) => {
      return k.split(',').map((subKey) => [subKey, v])
    }),
  ),
}

export const queryBuilderContent = {
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
