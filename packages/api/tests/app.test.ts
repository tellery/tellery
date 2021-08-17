/* eslint no-param-reassign: ["error", { "props": false }] */
import test, { ExecutionContext } from 'ava'
import Bluebird from 'bluebird'
import got from 'got'
import _, { random } from 'lodash'
import { nanoid } from 'nanoid'
import { Socket } from 'socket.io'
import { io } from 'socket.io-client'
import { getConnection, getRepository } from 'typeorm'

import app from '../src'
import { createDatabaseCon } from '../src/clients/db/orm'
import { BlockOperation } from '../src/core/block/operation'
import { SearchableResourceType } from '../src/core/search/interface'
import BlockEntity from '../src/entities/block'
import { ConnectorEntity } from '../src/entities/connector'
import { LinkEntity } from '../src/entities/link'
import { SnapshotEntity } from '../src/entities/snapshot'
import { UserEntity } from '../src/entities/user'
import { getNotificationService } from '../src/socket/routers/story'
import { AuthType } from '../src/types/auth'
import { BlockParentType, BlockType } from '../src/types/block'
import { LinkType } from '../src/types/link'
import { defaultPermissions } from '../src/types/permission'
import { BroadCastEvent, OnEventType } from '../src/types/socket'
import { set, uuid } from './testutils'

const delay = 800
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

test.afterEach.always((t: ExecutionContext<any>) => {
  t.context.client.disconnect()
})

test.serial('post /api/connectors/list', async (t: ExecutionContext<any>) => {
  const rp = getConnection().getRepository(ConnectorEntity)
  const wid = nanoid()
  const connector = await rp.save({
    workspaceId: wid,
    authType: AuthType.BASIC,
    authData: {
      username: 'username',
      password: 'password',
    },
    url: 'url',
    name: 'name',
    alive: true,
  })
  const res: any = await got('api/connectors/list', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId: wid,
    },
  }).json()

  t.not(
    _.findIndex(res.connectors, {
      id: connector.id,
      name: 'name',
      url: 'url',
    }),
    -1,
  )

  await rp.delete(connector.id)
})

test.serial('test socket connection', async (t: ExecutionContext<any>) => {
  const sockets = await getNotificationService().nio.allSockets()
  t.not(sockets.size, 0)
})

test.serial('test send and receive workspace notification', async (t: ExecutionContext<any>) => {
  const client = t.context.client as Socket
  let success = false
  client.on('notification', (notification) => {
    if (_(notification).get('type') !== 'updateEntity') {
      return
    }

    const oid = notification.value[0].operatorId
    if (oid === 'success') {
      success = true
    } else {
      t.fail()
    }
  })

  await Bluebird.delay(delay)
  // success
  await getNotificationService().sendUpdateEntityEvent('test', 'success', [
    { id: 'success', type: 'workspaceView' },
  ])
  // failure，should not receive this
  await getNotificationService().sendUpdateEntityEvent('test2', 'failure', [
    { id: 'failure', type: 'workspaceView' },
  ])

  await Bluebird.delay(delay)

  if (success) {
    t.pass()
    return
  }
  t.fail()
})

test.serial('test send and receive story notification', async (t: ExecutionContext<any>) => {
  const client = t.context.client as Socket
  let success = false
  client.on('notification', (notification) => {
    if (_(notification).get('type') !== 'updateEntity') {
      return
    }

    const oid = notification.value[0].operatorId
    if (oid === 'success' && notification.value.length === 2) {
      success = true
    } else {
      t.fail()
    }
  })

  client.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId: 'success' },
  })

  await Bluebird.delay(delay)

  // success
  await getNotificationService().sendUpdateEntityEvent('test', 'success', [
    { id: 'success', type: 'block' },
    { id: 'successBlock', type: 'block', storyId: 'success' },
  ])
  // failure，should not receive this
  await getNotificationService().sendUpdateEntityEvent('test2', 'failure', [
    { id: 'failure', type: 'block' },
  ])

  await Bluebird.delay(delay)

  if (success) {
    t.pass()
    return
  }
  t.fail()
})

test.serial('test receive notification for multi client', async (t: ExecutionContext<any>) => {
  const client1 = t.context.client as Socket
  let success1 = false
  client1.on('notification', (notification) => {
    if (_(notification).get('type') !== 'updateEntity') {
      return
    }
    const oid = notification.value[0].operatorId
    if (oid === 'success') {
      success1 = true
    } else {
      t.fail()
    }
  })
  await Bluebird.delay(delay)
  client1.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId: 'success' },
  })

  const client2 = io(`${t.context.prefixUrl}/workspace`, {
    reconnectionAttempts: 10,
    transports: ['websocket'],
    query: {
      workspaceId: 'test',
      userId: uuid(),
    },
  })
  let success2 = false
  await Bluebird.delay(delay)
  client2.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId: 'success' },
  })
  await Bluebird.delay(delay)
  // success
  // NOTE: update entity is global broadcast now
  getNotificationService()
    .sendUpdateEntityEvent('test', 'success', [{ id: 'success', type: 'block' }])
    .catch((err) => console.log(err))
  // failure，should not receive this，different namespace
  getNotificationService()
    .sendUpdateEntityEvent('test2', 'failure', [{ id: 'failure', type: 'block' }])
    .catch((err) => console.log(err))

  client2.on('notification', (notification: any) => {
    if (_(notification).get('type') !== 'updateEntity') {
      return
    }
    const oid = notification.value[0].operatorId
    if (oid === 'success') {
      success2 = true
    } else {
      t.fail()
    }
  })

  await Bluebird.delay(delay)
  client2.disconnect()
  if (success1 && success2) {
    t.pass()
    return
  }
  t.fail()
})

test.serial('test active users in story', async (t: ExecutionContext<any>) => {
  const client1 = t.context.client as Socket
  const storyId = nanoid()
  let broadcastCount = 0

  client1.on('notification', (notification) => {
    if (_(notification).get('type') !== 'broadcast') {
      return
    }
    broadcastCount++
    const { value } = notification
    console.log('value', value)
  })
  await Bluebird.delay(delay)
  client1.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId },
  })

  await Bluebird.delay(delay)
  let onlineUsers = await getNotificationService().getActiveUserIdsInStory(storyId)

  t.deepEqual(onlineUsers, ['testUser1'])

  const client2 = io(`${t.context.prefixUrl}/workspace`, {
    reconnectionAttempts: 10,
    transports: ['websocket'],
    query: {
      workspaceId: 'test',
      userId: 'test',
    },
  })
  await Bluebird.delay(delay)
  client2.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId },
  })
  await Bluebird.delay(delay)
  onlineUsers = await getNotificationService().getActiveUserIdsInStory(storyId)
  t.deepEqual(onlineUsers, ['testUser1', 'test'])

  client2.disconnect()
  await Bluebird.delay(delay)
  onlineUsers = await getNotificationService().getActiveUserIdsInStory(storyId)
  t.is(onlineUsers.length, 1)
  // 4 notifications are received
  // 1. enter -> activeUser 2. enter -> activeUser 3. disconnect -> activeUser 4. disconnected
  t.is(broadcastCount >= 4, true)
})

test.serial('test receive broadcast messages by server', async (t: ExecutionContext<any>) => {
  const client1 = t.context.client as Socket
  let success2 = false

  const client2 = io(`${t.context.prefixUrl}/workspace`, {
    reconnectionAttempts: 10,
    transports: ['websocket'],
    query: {
      workspaceId: 'test',
      userId: 'mockUser',
    },
  })
  let success1 = false
  client2.on('connect', () => {
    // got moveMouse event
    client2.on('notification', (notification: any) => {
      if (_(notification).get('value.event') !== BroadCastEvent.MOVE_MOUSE_IN_STORY) {
        return
      }
      t.deepEqual(notification, {
        type: 'broadcast',
        value: {
          event: 'moveMouseInStory',
          args: { storyId: 'xxx', blockId: 'xxx' },
        },
      })
      success2 = true
    })
  })
  await Bluebird.delay(delay)
  client2.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId: 'xxx' },
  })
  await Bluebird.delay(delay)
  client2.emit('broadcast', {
    event: BroadCastEvent.MOVE_MOUSE_IN_STORY,
    args: { storyId: 'xxx', blockId: 'xxx' },
  })

  await Bluebird.delay(delay)
  const client2Id = client2.id

  client1.on('notification', (notification: any) => {
    // got disconnection of client2
    if (_(notification).get('value.event') !== 'userDisconnected') {
      return
    }
    t.deepEqual(notification, {
      type: 'broadcast',
      value: {
        event: 'userDisconnected',
        args: {
          operatorId: 'mockUser',
          sessionId: client2Id,
        },
      },
    })
    success1 = true
  })
  await Bluebird.delay(delay)
  client1.emit('event', {
    type: OnEventType.USER_ENTER_STORY,
    value: { storyId: 'xxx' },
  })
  await Bluebird.delay(delay)
  client1.emit('broadcast', {
    event: BroadCastEvent.MOVE_MOUSE_IN_STORY,
    args: { storyId: 'xxx', blockId: 'xxx' },
  })

  await Bluebird.delay(delay)
  client2.disconnect()
  await Bluebird.delay(delay)
  t.is(success1, true)
  t.is(success2, true)
})

test.serial('post /api/mgetResources', async (t: ExecutionContext<any>) => {
  const randomId = nanoid()
  const ssid = nanoid()
  const tsid = nanoid()
  const qid = nanoid()
  const sbid = nanoid()
  const sbid2 = nanoid()
  const snapId = nanoid()
  const con = getConnection()
  const user = await con.getRepository(UserEntity).save({
    username: randomId,
    avatar: randomId,
    email: randomId,
    password: nanoid(),
  })
  const sourceStory = await con.getRepository(BlockEntity).save({
    id: ssid,
    interKey: ssid,
    workspaceId: 'test',
    parentId: nanoid(),
    parentTable: BlockParentType.WORKSPACE,
    storyId: ssid,
    type: BlockType.STORY,
    permissions: defaultPermissions,
    content: { title: [[nanoid()]] },
    children: [],
    alive: true,
    createdById: user.id,
  })
  const targetStory = await con.getRepository(BlockEntity).save({
    id: tsid,
    interKey: tsid,
    workspaceId: 'test',
    parentId: nanoid(),
    parentTable: BlockParentType.WORKSPACE,
    storyId: tsid,
    type: BlockType.STORY,
    permissions: defaultPermissions,
    content: { title: [[nanoid()]] },
    children: [],
    alive: true,
    createdById: user.id,
  })
  const sourceBlock = await con.getRepository(BlockEntity).save({
    id: sbid,
    interKey: sbid,
    workspaceId: 'test',
    storyId: sourceStory.id,
    parentId: sourceStory.id,
    permissions: defaultPermissions,
    parentTable: BlockParentType.BLOCK,
    type: BlockType.TEXT,
    content: {},
    alive: true,
    createdById: user.id,
  })
  const sourceBlock2 = await con.getRepository(BlockEntity).save({
    id: sbid2,
    interKey: sbid2,
    workspaceId: 'test',
    storyId: sourceStory.id,
    parentId: sourceStory.id,
    permissions: defaultPermissions,
    parentTable: BlockParentType.BLOCK,
    type: BlockType.TEXT,
    content: {},
    alive: true,
    createdById: user.id,
  })
  const question = await con.getRepository(BlockEntity).save({
    id: qid,
    interKey: qid,
    workspaceId: 'test',
    parentId: targetStory.id,
    parentTable: BlockParentType.BLOCK,
    permissions: defaultPermissions,
    storyId: targetStory.id,
    type: BlockType.SQL,
    children: [],
    content: {
      title: [[nanoid()]],
      sql: `select * from order${randomId}`,
    },
    alive: true,
    createdById: user.id,
  })
  const snapshot = await con.getRepository(SnapshotEntity).save({
    id: snapId,
    questionId: qid,
    data: { fields: [], records: [], truncated: false },
    sql: 'test',
    alive: true,
  })
  await con.getRepository(LinkEntity).save({
    sourceBlockId: sourceBlock.id,
    targetBlockId: targetStory.id,
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })
  await con.getRepository(LinkEntity).save({
    sourceBlockId: sourceBlock2.id,
    targetBlockId: question.id,
    type: LinkType.BLOCK,
    sourceAlive: true,
    targetAlive: true,
  })

  const resp: any = await got<any>('api/mgetResources', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      requests: [
        {
          type: 'block',
          id: ssid,
          storyId: ssid,
        },
        {
          type: 'block',
          id: sbid,
          storyId: ssid,
        },
        {
          type: 'block',
          id: qid,
          storyId: tsid,
        },
        {
          type: 'link',
          id: ssid,
        },
        {
          type: 'link',
          id: qid,
        },
        {
          type: 'user',
          id: user.id,
        },
        { type: 'snapshot', id: snapId },
      ],
    },
  }).json()

  t.not(!!resp.links, false)
  t.not(!!resp.users, false)
  t.not(!!resp.blocks, false)
  t.not(!!resp.snapshots, false)
  t.not(!!resp.snapshots[snapId], false)

  await con.getRepository(UserEntity).delete(user.id)
  await con
    .getRepository(BlockEntity)
    .delete([sourceStory.id, targetStory.id, sourceBlock.id, sourceBlock2.id, question.id])
  await con.getRepository(SnapshotEntity).delete(snapshot.id)
  await con.getRepository(LinkEntity).delete({ sourceBlockId: sourceBlock.id })
  await con.getRepository(LinkEntity).delete({ targetBlockId: question.id })
})

test.serial('mget load story', async (t: ExecutionContext<any>) => {
  const sid1 = nanoid()
  const qid = nanoid()
  const sid2 = nanoid()
  const bid = nanoid()

  await getConnection().transaction(async (manager) => {
    const bop = new BlockOperation('test', 'test', manager)

    // create story
    await set(
      bop,
      sid1,
      {
        id: sid1,
        children: [bid],
        type: 'story',
        content: { title: [[sid1]] },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid1,
        alive: true,
      },
      [],
    )
    await set(
      bop,
      sid2,
      {
        id: sid2,
        children: [],
        type: 'story',
        content: { title: [[sid2]] },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid2,
        alive: true,
      },
      [],
    )
    // create block
    await set(
      bop,
      bid,
      {
        id: bid,
        children: [],
        type: 'text',
        content: {
          title: [
            ['‣', [['r', 's', sid2]]],
            ['‣', [['r', 'q', qid]]],
          ], // link
          format: {},
        },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid1,
        alive: true,
      },
      [],
    )

    // create question
    await set(
      bop,
      qid,
      {
        id: qid,
        workspaceId: 'xxx',
        type: BlockType.SQL,
        storyId: sid1,
        parentId: 'test',
        parentTable: 'workspace',
        content: {
          title: [[nanoid()]],
          sql: 'select * from order limit 1',
        },
        alive: true,
      },
      [],
    )
  })

  const resp: any = await got<any>('api/stories/load', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      storyId: sid1,
    },
  }).json()

  t.is(_(resp.blocks).keys().value().length, 4)
})

test.serial('global search', async (t: ExecutionContext<any>) => {
  const sid1 = nanoid()
  const qid = nanoid()
  const bid = nanoid()
  // here nanoid() will be word cutting
  const title = `${random(100000)}`

  await getConnection().transaction(async (manager) => {
    const bop = new BlockOperation('test', 'test', manager)

    // create story
    await set(
      bop,
      sid1,
      {
        id: sid1,
        children: [bid],
        type: 'story',
        content: { title: [[title]] },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid1,
        alive: true,
      },
      [],
    )
    // create block
    await set(
      bop,
      bid,
      {
        id: bid,
        children: [],
        type: 'text',
        content: {
          title: [[title]],
        },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid1,
        alive: true,
      },
      [],
    )

    // create question
    await set(
      bop,
      qid,
      {
        id: qid,
        workspaceId: 'xxx',
        type: BlockType.SQL,
        storyId: sid1,
        parentId: 'test',
        parentTable: 'workspace',
        content: {
          title: [[title]],
          sql: 'select * from order limit 1',
        },
        alive: true,
      },
      [],
    )
  })

  const searchAll: any = await got<any>('api/search', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      keyword: title,
      types: [SearchableResourceType.BLOCK],
      limit: 20,
    },
  }).json()

  t.is(_(searchAll.results.blocks).keys().value().length, 3)

  // with filters
  const searchQuestions: any = await got<any>('api/search', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      keyword: title,
      types: [SearchableResourceType.BLOCK],
      filters: {
        type: BlockType.SQL,
      },
      limit: 20,
    },
  }).json()

  // 1. text block 2. story block
  t.is(_(searchQuestions.results.blocks).keys().value().length, 2)
})

test.serial('search question blocks by sql', async (t: ExecutionContext<any>) => {
  const sid1 = nanoid()
  const qid = nanoid()
  const bid = nanoid()
  // here nanoid() will be word cutting
  const title = `title used for api test ${nanoid()}`
  const sql = 'select * from order limit 1'

  await getConnection().transaction(async (manager) => {
    const bop = new BlockOperation('test', 'test', manager)

    // create story
    await set(
      bop,
      sid1,
      {
        id: sid1,
        children: [bid],
        type: 'story',
        content: { title: [[title]] },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid1,
        alive: true,
      },
      [],
    )

    // create question
    await set(
      bop,
      qid,
      {
        id: qid,
        workspaceId: 'xxx',
        type: BlockType.SQL,
        storyId: sid1,
        parentId: 'test',
        parentTable: 'workspace',
        content: {
          title: [[title]],
          sql,
        },
        alive: true,
      },
      [],
    )
  })

  // only return sql blocks
  const searchQuestions: any = await got<any>('api/questions/search', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      keyword: 'select',
      limit: 2000, // large enough
    },
  }).json()

  t.not(
    _(searchQuestions.results.searchResults).find((r) => r === qid),
    undefined,
  )

  // all results are sql blocks
  _(searchQuestions.results.searchResults)
    .map((r) => searchQuestions.results.blocks[r].type)
    .forEach((type) => t.is(type, BlockType.SQL))

  // not find with title
  const searchWithoutSql: any = await got<any>('api/questions/search', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      keyword: title,
      limit: 20,
    },
  }).json()

  t.is(searchWithoutSql.results.searchResults.length, 0)
})

test.serial('reference completion', async (t: ExecutionContext<any>) => {
  const sid1 = nanoid()
  const qid = nanoid()
  const mid1 = nanoid()
  const mid2 = nanoid()
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const workspaceId = uuid()
  // here nanoid() will be word cutting
  const title = `searchable title`
  const sql = 'select * from order limit 1'

  await getConnection().transaction(async (manager) => {
    const bop = new BlockOperation('test', 'test', manager)

    // create story
    await set(
      bop,
      sid1,
      {
        id: sid1,
        children: [qid, mid1, mid2],
        type: 'story',
        content: { title: [[title]] },
        parentId: 'test',
        parentTable: 'workspace',
        storyId: sid1,
        alive: true,
      },
      [],
    )
    // create question
    await set(
      bop,
      qid,
      {
        id: qid,
        workspaceId,
        type: BlockType.SQL,
        storyId: sid1,
        parentId: workspaceId,
        parentTable: 'workspace',
        content: {
          title: [[title]],
          sql,
        },
        alive: true,
      },
      [],
    )
    // create metrics 1
    await set(
      bop,
      mid1,
      {
        id: mid1,
        workspaceId,
        type: BlockType.METRIC,
        storyId: sid1,
        parentId: workspaceId,
        parentTable: 'workspace',
        content: {
          title: [[title]],
          sql,
        },
        alive: true,
      },
      [],
    )
    // create metrics 2
    await set(
      bop,
      mid2,
      {
        id: mid2,
        workspaceId,
        type: BlockType.METRIC,
        storyId: sid1,
        parentId: workspaceId,
        parentTable: 'workspace',
        content: {
          title: [[title]],
          sql,
        },
        alive: true,
      },
      [],
    )
  })

  // not find with title
  const completionRes3: any = await got<any>('api/referenceCompletion', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      keyword: 'searchable',
      limit: 3,
    },
  }).json()
  const srs3 = completionRes3.results.searchResults
  const blocks3 = completionRes3.results.blocks
  t.is(srs3.length, 3)
  // first two are metric blocks
  t.is(blocks3[srs3[0]].type, BlockType.METRIC)
  t.is(blocks3[srs3[1]].type, BlockType.METRIC)
  // last one is sql block
  t.is(blocks3[srs3[2]].type, BlockType.SQL)
  // contains story blocks
  t.not(blocks3[sid1], undefined)

  // not find with title
  const completionRes2: any = await got<any>('api/referenceCompletion', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      workspaceId,
      keyword: 'searchable',
      limit: 2,
    },
  }).json()
  const srs2 = completionRes2.results.searchResults
  const blocks2 = completionRes2.results.blocks
  t.is(srs2.length, 2)
  // all of them are metric blocks
  t.is(blocks2[srs2[0]].type, 'metric')
  t.is(blocks2[srs2[1]].type, 'metric')
  t.not(blocks2[sid1], undefined)

  await getRepository(BlockEntity).delete([qid, mid1, mid2])
})
