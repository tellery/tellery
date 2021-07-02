/* eslint-disable no-param-reassign */
import '../../../src/core/block/init'

import test, { ExecutionContext } from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { BlockOperation } from '../../../src/core/block/operation'
import { Permission } from '../../../src/core/permission'
import { search } from '../../../src/core/search'
import { getISearch, SearchableResourceType } from '../../../src/core/search/interface'
import BlockEntity from '../../../src/entities/block'
import { UserEntity } from '../../../src/entities/user'
import { WorkspaceEntity } from '../../../src/entities/workspace'
import { PermissionWorkspaceRole } from '../../../src/types/permission'
import { mockBlocks, mockStories, set, uuid } from '../../testutils'
import { WorkspaceMemberEntity } from '../../../src/entities/workspaceMember'
import { WorkspaceMemberStatus } from '../../../src/types/workspace'

const permission = new Permission()

test.before(async (t: ExecutionContext<any>) => {
  await createDatabaseCon()
  const con = getConnection()
  const member = await con.getRepository(UserEntity).save({
    username: nanoid(),
    email: nanoid(),
    avatar: 'xxx',
    password: nanoid(),
  })
  const admin = await con.getRepository(UserEntity).save({
    username: nanoid(),
    email: nanoid(),
    avatar: 'xxx',
    password: nanoid(),
  })
  const workspace = await con.getRepository(WorkspaceEntity).save({
    name: nanoid(),
    inviteCode: nanoid(),
  })

  await con.getRepository(WorkspaceMemberEntity).save([
    {
      workspaceId: workspace.id,
      userId: member.id,
      role: PermissionWorkspaceRole.MEMBER,
      status: WorkspaceMemberStatus.ACTIVE,
    },
    {
      workspaceId: workspace.id,
      userId: admin.id,
      role: PermissionWorkspaceRole.ADMIN,
      status: WorkspaceMemberStatus.ACTIVE,
    },
  ])

  t.context.workspace = workspace
  t.context.member = member
  t.context.admin = admin
})

test.after.always(async (t: ExecutionContext<any>) => {
  const con = getConnection()
  await con.getRepository(UserEntity).delete(t.context.member.id)
  await con.getRepository(UserEntity).delete(t.context.admin.id)
  await con.getRepository(WorkspaceEntity).delete(t.context.workspace.id)
})

test('test canGetWorkspaceData', async (t: ExecutionContext<any>) => {
  const can = await permission.canGetWorkspaceData(t.context.member.id, t.context.workspace.id)
  t.is(can, true)

  const cant = await permission.canGetWorkspaceData('unknown', t.context.workspace)
  t.is(cant, false)
})

test('test canUpdateWorkspaceData', async (t: ExecutionContext<any>) => {
  const can = await permission.canUpdateWorkspaceData(t.context.admin.id, t.context.workspace.id)
  t.is(can, true)

  const cant = await permission.canUpdateWorkspaceData(t.context.member.id, t.context.workspace)
  t.is(cant, false)
})

test('test canGetBlockData', async (t: ExecutionContext<any>) => {
  const con = getConnection()
  // test story block
  const stories = await mockStories(1, t.context.workspace.id)
  const canGetStory = await permission.canGetBlockData(t.context.member.id, stories[0])
  t.is(canGetStory, true)
  // test common block
  const blocks = await mockBlocks(1, stories[0].id)
  const canGetBlock = await permission.canGetBlockData(t.context.member.id, blocks[0])
  t.is(canGetBlock, true)

  await con.getRepository(BlockEntity).delete(stories[0].id)
  await con.getRepository(BlockEntity).delete(blocks[0].id)
})

test('test canUpdateBlockData', async (t: ExecutionContext<any>) => {
  const con = getConnection()
  // test story block
  const stories = await mockStories(1, t.context.workspace.id)
  const canGetStory = await permission.canUpdateBlockData(t.context.member.id, stories[0])
  t.is(canGetStory, true)
  // test common block
  const blocks = await mockBlocks(1, stories[0].id)
  const canGetBlock = await permission.canUpdateBlockData(t.context.member.id, blocks[0])
  t.is(canGetBlock, true)

  await con.getRepository(BlockEntity).update(blocks[0].id, { permissions: [] })
  const cantGetBlock = await permission.canUpdateBlockData(t.context.member.id, blocks[0].id)
  t.is(cantGetBlock, false)

  await con.getRepository(BlockEntity).delete(stories[0].id)
  await con.getRepository(BlockEntity).delete(blocks[0].id)
})

test('test getSearchBlocksQuery', async (t: ExecutionContext<any>) => {
  const workspaceId = t.context.workspace.id
  const bid1 = nanoid()
  const bid2 = nanoid()
  const bid3 = nanoid()
  const title = `story for getting search blocks query ${nanoid()}`
  await getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), workspaceId, manager)
    // has permission
    await set(
      op,
      bid1,
      {
        id: bid1,
        parentId: workspaceId,
        parentTable: 'workspace',
        storyId: bid1,
        type: 'story',
        content: { title: [[title]] },
        children: ['oid'],
        alive: true,
      },
      [],
    )
    // does not have permission
    await set(
      op,
      bid2,
      {
        id: bid2,
        parentId: workspaceId,
        parentTable: 'workspace',
        storyId: bid2,
        type: 'thought',
        content: { date: [1, 2, 3] },
        children: ['oid'],
        createdById: uuid(),
        alive: true,
      },
      [],
    )
    await set(
      op,
      bid3,
      {
        id: bid3,
        parentId: bid2,
        parentTable: 'block',
        storyId: bid2,
        type: 'text',
        content: { title: [[title]] },
        children: ['oid'],
        alive: true,
      },
      [],
    )
  })

  const searchBlocksQuery = await permission.getSearchBlocksQuery(t.context.member.id, workspaceId)

  const res = await search(getISearch(), 'getting', async () => searchBlocksQuery, [
    SearchableResourceType.BLOCK,
  ])

  t.not(
    _(res.hints).find((hint) => (hint.hint as any).id === bid1),
    undefined,
  )
  t.is(
    _(res.hints).find((hint) => (hint.hint as any).id === bid3),
    undefined,
  )
  await getRepository(BlockEntity).delete([bid1, bid2, bid3])
})

test('test getSearchUsersQuery', async (t: ExecutionContext<any>) => {
  // should not be searched
  const others = await getRepository(UserEntity).save({
    username: nanoid(),
    email: nanoid(),
    avatar: 'xxx',
    password: nanoid(),
  })
  const searchUsersQuery = await permission.getSearchUsersQuery(
    t.context.member.id,
    t.context.workspace.id,
  )
  const notExist = await search(getISearch(), others.username, async () => searchUsersQuery, [
    SearchableResourceType.USER,
  ])
  t.is(
    _(notExist.hints).find((hint) => (hint.hint as any).id === others.id),
    undefined,
  )

  const exist = await search(
    getISearch(),
    t.context.member.username,
    async () => searchUsersQuery,
    [SearchableResourceType.USER],
  )
  t.not(
    _(exist.hints).find((hint) => (hint.hint as any).id === t.context.member.id),
    undefined,
  )
  await getRepository(UserEntity).delete(others.id)
})
