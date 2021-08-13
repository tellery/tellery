/* eslint no-param-reassign: ["error", { "props": false }] */
import test, { ExecutionContext } from 'ava'
import got from 'got'
import { keys, random } from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'
import io from 'socket.io-client'
import app from '../../src'
import BlockEntity from '../../src/entities/block'
import { BlockParentType, BlockType } from '../../src/types/block'
import { defaultPermissions } from '../../src/types/permission'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { LinkType } from '../../src/types/link'
import { uuid } from '../testutils'

const workspaceId = nanoid()

test.before.cb((t: ExecutionContext<any>) => {
  const port = random(8000, 20000, false)
  t.context.server = app

  t.context.server.listen(port, () => {
    t.context.prefixUrl = `http://localhost:${port}`
    createDatabaseCon()
      .then(() => (t as any).end())
      .catch((err) => console.error(err))
  })
})

test.after.always((t: ExecutionContext<any>) => {
  t.context.server.close()
})

test.beforeEach.cb((t: ExecutionContext<any>) => {
  const socket = io(`${t.context.prefixUrl}/workspace`, {
    reconnectionAttempts: 10,
    transports: ['websocket'],
    query: {
      workspaceId: 'test',
      userId: 'testUser1',
    },
  })
  socket.on('connect', () => {
    t.context.client = socket
    ;(t as any).end()
  })
})

test.serial('api saveTransactions and mgetLinks', async (t: ExecutionContext<any>) => {
  const id = nanoid()
  const sid = nanoid()
  const sid2 = nanoid()
  const resp: any = await got<any>('api/operations/saveTransactions', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      transactions: [
        {
          id: nanoid(),
          workspaceId,
          operations: [
            {
              cmd: 'set',
              id: sid,
              path: [],
              table: 'block',
              args: {
                id: sid,
                children: [id],
                type: 'story',
                content: { title: [[sid]] },
                parentId: 'test',
                parentTable: 'workspace',
                storyId: sid,
                alive: true,
              },
            },
            {
              cmd: 'set',
              id: sid2,
              path: [],
              table: 'block',
              args: {
                id: sid2,
                children: [],
                type: 'story',
                content: { title: [[sid2]] },
                parentId: 'test',
                parentTable: 'workspace',
                storyId: sid2,
                alive: true,
              },
            },
            {
              cmd: 'set',
              id,
              path: [],
              table: 'block',
              args: {
                type: 'text',
                id,
                parentId: sid,
                parentTable: 'block',
                storyId: sid,
                content: {
                  title: [[id], ['‣', [['r', 's', sid2]]]],
                  format: {},
                },
                alive: true,
              },
            },
          ],
        },
      ],
    },
  }).json()

  t.is(resp.success, true)

  const sResp: any = await got<any>('api/mgetResources', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId: 'test',
      requests: [{ type: 'link', id }],
    },
  }).json()

  t.deepEqual(sResp.links[id].forwardRefs, [{ blockId: sid2, storyId: sid2, type: LinkType.BLOCK }])

  const sResp2: any = await got<any>('api/mgetResources', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId: 'test',
      requests: [{ type: 'link', id: sid2 }],
    },
  }).json()

  t.deepEqual(sResp2.links[sid2].backwardRefs, [
    {
      storyId: sid,
      blockId: id,
      type: LinkType.BLOCK,
    },
  ])

  const rp = getConnection().getRepository(BlockEntity)

  await rp.delete([sid, sid2, id])
})

test.serial('test saveTransactions with row and column', async (t: ExecutionContext<any>) => {
  const wid = nanoid()
  const sid = nanoid()
  const textBlockId1 = nanoid()
  const textBlockId2 = nanoid()
  const columnBlockId1 = nanoid()
  const columnBlockId2 = nanoid()
  const rowBlockId = nanoid()

  // move text block to row block
  const moveTextBlockIntoRowBlock = {
    id: nanoid(),
    workspaceId: wid,
    transactions: [
      {
        id: nanoid(),
        workspaceId,
        operations: [
          {
            cmd: 'set',
            id: sid,
            path: [],
            table: 'block',
            args: {
              id: sid,
              children: [textBlockId1, rowBlockId],
              type: 'story',
              content: { title: [[sid]] },
              parentId: 'test',
              parentTable: 'workspace',
              storyId: sid,
              alive: true,
            },
          },
          {
            cmd: 'set',
            id: textBlockId1,
            path: [],
            table: 'block',
            args: {
              id: textBlockId1,
              type: 'text',
              content: { title: [[]] },
              parentId: sid,
              parentTable: 'block',
              storyId: sid,
              alive: true,
            },
          },
          {
            cmd: 'set',
            id: textBlockId2,
            path: [],
            table: 'block',
            args: {
              id: textBlockId2,
              type: 'text',
              content: { title: [[]] },
              parentId: sid,
              parentTable: 'block',
              storyId: sid,
              alive: true,
            },
          },
          {
            cmd: 'set',
            id: rowBlockId,
            path: [],
            table: 'block',
            args: {
              id: rowBlockId,
              type: 'row',
              children: [],
              parentId: sid,
              parentTable: 'block',
              storyId: sid,
              alive: true,
            },
          },
          {
            cmd: 'listRemove',
            id: sid,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId1 },
          },
          {
            cmd: 'listAfter',
            id: rowBlockId,
            path: ['children'],
            table: 'block',
            args: { id: columnBlockId1, after: '' },
          },
          {
            cmd: 'listAfter',
            id: rowBlockId,
            path: ['children'],
            table: 'block',
            args: { id: columnBlockId2, after: columnBlockId1 },
          },
          {
            cmd: 'set',
            id: columnBlockId1,
            path: [],
            table: 'block',
            args: {
              type: 'column',
              id: columnBlockId1,
              storyId: sid,
              parentId: rowBlockId,
              parentTable: 'block',
              children: [],
              alive: true,
            },
          },
          {
            cmd: 'set',
            id: columnBlockId2,
            path: [],
            table: 'block',
            args: {
              type: 'column',
              id: columnBlockId2,
              storyId: sid,
              parentId: rowBlockId,
              parentTable: 'block',
              children: [],
              alive: true,
            },
          },
          {
            cmd: 'listAfter',
            id: columnBlockId1,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId1, after: '' },
          },
          {
            cmd: 'listAfter',
            id: columnBlockId2,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId2, after: '' },
          },
          {
            cmd: 'update',
            id: textBlockId1,
            path: ['parentId'],
            table: 'block',
            args: columnBlockId1,
          },
          {
            cmd: 'update',
            id: textBlockId2,
            path: ['parentId'],
            table: 'block',
            args: columnBlockId2,
          },
        ],
      },
    ],
  }

  const saveResp1: any = await got<any>('api/operations/saveTransactions', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: moveTextBlockIntoRowBlock,
  }).json()

  t.deepEqual(saveResp1, { success: true })

  const storyResp1: any = await got<any>('api/stories/load', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId: 'test',
      storyId: sid,
    },
  }).json()

  t.deepEqual(storyResp1.blocks[columnBlockId1].children, [textBlockId1])
  t.deepEqual(storyResp1.blocks[columnBlockId2].children, [textBlockId2])
  t.deepEqual(storyResp1.blocks[rowBlockId].children, [columnBlockId1, columnBlockId2])
  t.deepEqual(storyResp1.blocks[sid].children, [rowBlockId])

  // revert
  const moveColumnBlockOutOfRowBlock = {
    id: nanoid(),
    workspaceId: wid,
    transactions: [
      {
        id: nanoid(),
        workspaceId,
        operations: [
          // delete text block1 from column block1
          {
            cmd: 'listRemove',
            id: columnBlockId1,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId1 },
          },
          // delete column block1 from row block
          {
            cmd: 'listRemove',
            id: rowBlockId,
            path: ['children'],
            table: 'block',
            args: { id: columnBlockId1 },
          },
          {
            cmd: 'update',
            id: columnBlockId1,
            path: ['alive'],
            table: 'block',
            args: false,
          },
          // delete column block2 from row block
          {
            cmd: 'listRemove',
            id: rowBlockId,
            path: ['children'],
            table: 'block',
            args: { id: columnBlockId2 },
          },
          {
            cmd: 'update',
            id: columnBlockId2,
            path: ['alive'],
            table: 'block',
            args: false,
          },
          // delete row block from story
          {
            cmd: 'listRemove',
            id: sid,
            path: ['children'],
            table: 'block',
            args: { id: rowBlockId },
          },
          {
            cmd: 'update',
            id: rowBlockId,
            path: ['alive'],
            table: 'block',
            args: false,
          },
          // move text block2 to story block
          {
            cmd: 'listRemove',
            id: columnBlockId2,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId2 },
          },
          {
            cmd: 'listAfter',
            id: sid,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId2, after: '' },
          },
          {
            cmd: 'update',
            id: textBlockId2,
            path: ['parentId'],
            table: 'block',
            args: sid,
          },
          // move text block1 to story block
          {
            cmd: 'listAfter',
            id: sid,
            path: ['children'],
            table: 'block',
            args: { id: textBlockId1, after: textBlockId2 },
          },
          {
            cmd: 'update',
            id: textBlockId1,
            path: ['parentId'],
            table: 'block',
            args: sid,
          },
        ],
      },
    ],
  }
  const saveResp2: any = await got<any>('api/operations/saveTransactions', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: moveColumnBlockOutOfRowBlock,
  }).json()

  t.deepEqual(saveResp2, { success: true })

  const storyResp2: any = await got<any>('api/stories/load', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId: 'test',
      storyId: sid,
    },
  }).json()

  t.deepEqual(keys(storyResp2.blocks).length, 3)
  t.deepEqual(storyResp2.blocks[sid].children, [textBlockId2, textBlockId1])
})

test.serial('test saveTransactions with bigInt', async (t: ExecutionContext<any>) => {
  const sid = nanoid()
  const rp = getConnection().getRepository(BlockEntity)
  await rp.save({
    id: sid,
    interKey: sid,
    workspaceId: 'test',
    content: { title: [[sid]] },
    storyId: sid,
    type: BlockType.STORY,
    parentId: 'test',
    parentTable: BlockParentType.WORKSPACE,
    permissions: defaultPermissions,
    children: [],
    alive: true,
  })
  const bigIntTitle = '11111111111111111111111111111111111111111'

  await rp.delete(sid)

  try {
    await got<any>('api/operations/saveTransactions', {
      prefixUrl: t.context.prefixUrl,
      method: 'POST',
      json: {
        transactions: [
          {
            id: nanoid(),
            workspaceId,
            operations: [
              {
                cmd: 'set',
                id: sid,
                path: ['content', 'title'],
                table: 'block',
                args: [[bigIntTitle]],
              },
            ],
          },
        ],
      },
    })
  } catch (e) {
    t.fail(e)
  }

  const resp: any = await got<any>('api/mgetResources', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      requests: [{ type: 'block', id: sid }],
    },
  }).json()

  await rp.delete(sid)

  t.deepEqual(resp.blocks[sid].content, { title: [[bigIntTitle]] })
})

test.serial('test auto set blocks createdById', async (t: ExecutionContext<any>) => {
  const wid = uuid()
  const tid = nanoid()
  const createThought = {
    transactions: [
      {
        id: nanoid(),
        workspaceId,
        operations: [
          {
            cmd: 'set',
            id: tid,
            path: [],
            table: 'block',
            args: {
              id: tid,
              children: [],
              type: 'thought',
              content: { title: [[tid]], date: nanoid() },
              parentId: 'test',
              parentTable: wid,
              storyId: tid,
              alive: true,
            },
          },
        ],
      },
    ],
  }

  await got<any>('api/operations/saveTransactions', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: createThought,
  })

  const block = await getRepository(BlockEntity).findOneOrFail(tid)

  t.not(block.createdById, null)
})
