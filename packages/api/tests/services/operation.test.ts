import '../../src/core/block/init'

import test from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakeSocketManager } from '../../src/clients/socket/fake'
import { FakePermission } from '../../src/core/permission'
import BlockEntity from '../../src/entities/block'
import { OperationService } from '../../src/services/operation'
import { BlockParentType, BlockType } from '../../src/types/block'
import { OperationCmdType, OperationTableType } from '../../src/types/operation'
import { uuid } from '../testutils'

const operationService = new OperationService(new FakePermission(), new FakeSocketManager())

test.before(async () => {
  await createDatabaseCon()
})

const operations = [
  {
    cmd: OperationCmdType.SET,
    id: 'storyIdx',
    path: [],
    table: OperationTableType.BLOCK,
    args: {
      id: 'storyIdx',
      storyId: 'storyIdx',
      parentId: 'test',
      parentTable: BlockParentType.WORKSPACE,
      type: BlockType.STORY,
      content: { title: [[nanoid()]] },
      children: [],
      alive: true,
    },
  },
  {
    cmd: OperationCmdType.SET,
    id: 'blockIdx',
    path: [],
    table: OperationTableType.BLOCK,
    args: {
      id: 'blockIdx',
      storyId: 'storyIdx',
      parentId: 'storyIdx',
      parentTable: BlockParentType.BLOCK,
      type: BlockType.TEXT,
      content: 'test',
      alive: true,
    },
  },
]

test('saveSingleTransaction', async (t) => {
  // regular
  const uid = uuid()
  await operationService.saveSingleTransaction(uid, 'test', operations)

  const block = await getRepository(BlockEntity).findOne('blockIdx')
  t.not(block, undefined)
  t.deepEqual(block?.storyId, 'storyIdx')

  await getRepository(BlockEntity).delete('blockIdx')

  // error thrown
  try {
    await operationService.saveSingleTransaction(uid, 'test', [
      {
        cmd: OperationCmdType.SET,
        id: 'storyIdy',
        path: [],
        table: OperationTableType.BLOCK,
        args: {
          id: 'storyIdy',
          type: BlockType.STORY,
          parentId: 'test',
          parentTable: BlockParentType.WORKSPACE,
          content: { title: [[nanoid()]] },
          children: [],
          alive: true,
        },
      },
      {
        cmd: OperationCmdType.SET,
        id: 'blockIdy',
        path: [],
        table: OperationTableType.BLOCK,
        args: {
          id: 'blockIdy',
          parentId: 'storyIdy',
          parentTable: BlockParentType.BLOCK,
          type: BlockType.TEXT,
          content: 'test',
          alive: true,
        },
      },
    ])
  } catch (err) {
    const block2 = await getRepository(BlockEntity).findOne('blockIdy')
    t.is(block2, undefined)
    await getRepository(BlockEntity).delete('blockIdy')
    return
  }

  t.throws(() => new Error('should not be called'))
})

test('saveTransactions', async (t) => {
  // first succeeded, second failed
  const res = await operationService.saveTransactions(uuid(), [
    {
      id: '1',
      workspaceId: 'test',
      operations: [
        {
          cmd: OperationCmdType.SET,
          id: 'storyIdz',
          path: [],
          table: OperationTableType.BLOCK,
          args: {
            id: 'storyIdz',
            parentId: 'test',
            parentTable: BlockParentType.WORKSPACE,
            storyId: 'storyIdz',
            type: BlockType.STORY,
            content: { title: [[nanoid()]] },
            children: [],
            alive: true,
          },
        },
        {
          cmd: OperationCmdType.SET,
          id: 'blockIdz',
          path: [],
          table: OperationTableType.BLOCK,
          args: {
            id: 'blockIdz',
            parentId: 'storyIdz',
            parentTable: BlockParentType.BLOCK,
            storyId: 'storyIdz',
            type: BlockType.TEXT,
            content: 'test',
            alive: true,
          },
        },
      ],
    },
    {
      id: '2',
      workspaceId: 'test',
      operations: [
        {
          cmd: OperationCmdType.SET,
          id: 'storyIdd',
          path: [],
          table: OperationTableType.BLOCK,
          args: {
            id: 'storyIdd',
            parentId: 'test',
            parentTable: BlockParentType.WORKSPACE,
            type: BlockType.STORY,
            content: { title: [[nanoid()]] },
            children: [],
            alive: true,
          },
        },
        {
          cmd: OperationCmdType.SET,
          id: 'blockIdd',
          path: [],
          table: OperationTableType.BLOCK,
          args: {
            id: 'blockIdd',
            type: BlockType.TEXT,
            content: 'test',
            alive: true,
          },
        },
      ],
    },
  ])

  t.is(res.length, 1)
  const blockz = await getRepository(BlockEntity).findOne('blockIdz')
  t.not(blockz, undefined)

  const blockd = await getRepository(BlockEntity).findOne('blockIdd')
  t.is(blockd, undefined)
})

test('saveSingleTransaction-mergeOperations', async (t) => {
  const id = nanoid()
  await operationService.saveSingleTransaction('test', 'test', [
    {
      cmd: OperationCmdType.SET,
      id,
      path: [],
      table: OperationTableType.BLOCK,
      args: {
        id,
        parentId: id,
        parentTable: BlockParentType.BLOCK,
        storyId: id,
        type: BlockType.TEXT,
        content: 'test',
        alive: true,
      },
    },
    {
      cmd: OperationCmdType.SET,
      id,
      path: [],
      table: OperationTableType.BLOCK,
      args: {
        id,
        parentId: id,
        parentTable: BlockParentType.BLOCK,
        storyId: id,
        type: BlockType.TEXT,
        content: 'test2',
        alive: true,
      },
    },
  ])

  const model = await getRepository(BlockEntity).findOne(id)
  t.deepEqual(model?.content, 'test2')
})

test('makeNotificationPayload', (t) => {
  // 1. regular
  const payload1 = operationService.makeNotificationPayload([
    { id: 'test', workspaceId: 'test', operations },
  ])
  t.deepEqual(payload1, [
    {
      workspaceId: 'test',
      opts: [
        { id: 'storyIdx', type: 'block', storyId: 'storyIdx' },
        { id: 'blockIdx', type: 'block', storyId: 'storyIdx' },
      ],
    },
  ])

  const operations2 = [
    {
      cmd: OperationCmdType.SET,
      id: 'storyIdy',
      path: [],
      table: OperationTableType.BLOCK,
      args: {
        id: 'storyIdy',
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        storyId: 'storyIdy',
        type: BlockType.STORY,
        content: { title: [[nanoid()]] },
        children: [],
        alive: true,
      },
    },
    {
      cmd: OperationCmdType.SET,
      id: 'blockIdy',
      path: [],
      table: OperationTableType.BLOCK,
      args: {
        id: 'blockIdy',
        storyId: 'storyIdy',
        parentId: 'storyIdy',
        parentTable: BlockParentType.BLOCK,
        type: BlockType.TEXT,
        content: 'test',
        alive: true,
      },
    },
  ]

  // 2. multi story
  const payload2 = operationService.makeNotificationPayload([
    { id: 'test', workspaceId: 'test', operations },
    { id: 'test2', workspaceId: 'test', operations: operations2 },
  ])
  t.deepEqual(payload2, [
    {
      workspaceId: 'test',
      opts: [
        { id: 'storyIdx', storyId: 'storyIdx', type: 'block' },
        { id: 'blockIdx', storyId: 'storyIdx', type: 'block' },
        { id: 'storyIdy', storyId: 'storyIdy', type: 'block' },
        { id: 'blockIdy', storyId: 'storyIdy', type: 'block' },
      ],
    },
  ])

  // 3. multi workspace
  const payload3 = operationService.makeNotificationPayload([
    { id: 'test', workspaceId: 'test', operations },
    { id: 'test2', workspaceId: 'test2', operations: operations2 },
  ])
  t.deepEqual(payload3, [
    {
      opts: [
        { id: 'storyIdx', storyId: 'storyIdx', type: 'block' },
        { id: 'blockIdx', storyId: 'storyIdx', type: 'block' },
      ],
      workspaceId: 'test',
    },
    {
      opts: [
        { id: 'storyIdy', storyId: 'storyIdy', type: 'block' },
        { id: 'blockIdy', storyId: 'storyIdy', type: 'block' },
      ],
      workspaceId: 'test2',
    },
  ])
})
