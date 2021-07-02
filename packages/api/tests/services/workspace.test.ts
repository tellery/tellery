import test from 'ava'
import _, { filter } from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakePermission } from '../../src/core/permission'
import { Workspace } from '../../src/core/workspace'
import { UserEntity } from '../../src/entities/user'
import { WorkspaceEntity } from '../../src/entities/workspace'
import { WorkspaceViewEntity } from '../../src/entities/workspaceView'
import { WorkspaceService } from '../../src/services/workspace'
import { PermissionWorkspaceRole } from '../../src/types/permission'
import { AccountStatus } from '../../src/types/user'
import { WorkspaceDTO, WorkspaceMemberStatus } from '../../src/types/workspace'
import { mockUsers, uuid } from '../testutils'

const workspaceService = new WorkspaceService(new FakePermission())

test.before(async () => {
  await createDatabaseCon()
})

async function getInviteCode(workspaceId: string): Promise<string> {
  return getRepository(WorkspaceEntity)
    .findOneOrFail(workspaceId)
    .then((w) => w.inviteCode)
}

test('createWorkspace', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test')
  t.is(workspace.memberNum, 1)
  t.is(workspace.name, 'test')
  t.not(workspace.id, null)
  t.not(workspace.avatar, undefined)

  const model = await getRepository(WorkspaceEntity).findOne(workspace.id)
  t.not(model, undefined)
  t.is((model?.inviteCode?.length ?? 0) > 0, true)

  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('listWorkspaces', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test')
  const res1 = await workspaceService.list('test')
  t.is(res1.workspaces.length > 0, true)
  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('getWorkspace', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test')

  const res = await workspaceService.get('test', workspace.id)

  t.deepEqual(res.id, workspace.id)
  t.deepEqual(res.members[0].userId, uid)

  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('updateWorkspace', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test')
  const model = await getRepository(WorkspaceEntity).findOneOrFail(workspace.id)
  const newWorkspace = await workspaceService.update(uid, workspace.id, {
    name: 'newName',
    resetInviteCode: true,
  })
  const newModel = await getRepository(WorkspaceEntity).findOneOrFail(workspace.id)

  t.is(workspace.name !== newWorkspace.name, true)
  t.is(model.inviteCode !== newModel.inviteCode, true)
})

test('joinWorkspace', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()
  const workspace = await workspaceService.create(uid1, 'test')
  const res = await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  t.is(res.memberNum, 2)
  const res2 = await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  t.is(res2.memberNum, 2)

  await getRepository(WorkspaceEntity).delete(res.id)
})

test('leaveWorkspace', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()

  const workspace = await workspaceService.create(uid1, 'test')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))

  await workspaceService.leave(workspace.id, uid2)
  const model1 = await workspaceService.mustFindOneWithMembers(workspace.id)
  t.is(model1?.members.length, 1)

  await workspaceService.leave(workspace.id, uid1)
  // workspace should be deleted
  const model2 = await getRepository(WorkspaceEntity).findOne(workspace.id)
  t.is(model2, undefined)
})

test('kickout members', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()
  const uid3 = uuid()

  const workspace = await workspaceService.create(uid1, 'test')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  await workspaceService.join(workspace.id, uid3, await getInviteCode(workspace.id))

  await workspaceService.kickoutMembers(uid1, workspace.id, [uid2, uid3])
  const model = await workspaceService.mustFindOneWithMembers(workspace.id)
  t.is(model?.members.length, 1)
})

test('updateRoleWorkspace', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()
  const workspace = await workspaceService.create(uid1, 'test')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))

  const model1 = await workspaceService.mustFindOneWithMembers(workspace.id)

  const before = filter(model1?.members, (val) => val.userId === uid2)[0]
  t.deepEqual(before.role, PermissionWorkspaceRole.MEMBER)

  await workspaceService.updateRole(uid1, workspace.id, uid2, PermissionWorkspaceRole.ADMIN)

  const model2 = await workspaceService.mustFindOneWithMembers(workspace.id)
  const after = filter(model2?.members, (val) => val.userId === uid2)[0]
  t.deepEqual(after.role, PermissionWorkspaceRole.ADMIN)
})

test('inviteMembersWorkspace', async (t) => {
  const [inviter] = await mockUsers(1)
  const workspace = await workspaceService.create(inviter.id, 'test')

  // init user
  const res0 = await workspaceService.inviteMembers(inviter.id, workspace.id, [
    { email: `${nanoid()}@test.com`, role: PermissionWorkspaceRole.ADMIN },
  ])

  const first = _(res0.members).find((m) => m.userId !== inviter.id)
  t.is(res0.memberNum, 2)
  t.is(first?.role, PermissionWorkspaceRole.ADMIN)
  t.is(first?.status, WorkspaceMemberStatus.INVITED)
  const firstUser = await getRepository(UserEntity).findOne(first?.userId)
  // invited user status is confirmed
  t.is(firstUser?.status, AccountStatus.CREATING)

  const [invitee] = await mockUsers(1)
  // invite exist user
  const res1 = await workspaceService.inviteMembers(inviter.id, workspace.id, [
    { email: invitee.email, role: PermissionWorkspaceRole.ADMIN },
  ])
  await getRepository(WorkspaceEntity).delete(workspace.id)

  t.deepEqual(res1.memberNum, 3)
  t.deepEqual(findMember(res1, invitee.id)?.role, PermissionWorkspaceRole.ADMIN)
  t.deepEqual(findMember(res1, invitee.id)?.status, WorkspaceMemberStatus.INVITED)
})

test('invite duplicate members', async (t) => {
  const [inviter] = await mockUsers(1)
  const workspace = await workspaceService.create(inviter.id, 'test')

  const email = `${nanoid()}@test.com`
  await workspaceService.inviteMembers(inviter.id, workspace.id, [
    { email, role: PermissionWorkspaceRole.ADMIN },
  ])

  await workspaceService.inviteMembers(inviter.id, workspace.id, [
    { email, role: PermissionWorkspaceRole.ADMIN },
  ])

  t.pass()
})

test('getWorkspaceView', async (t) => {
  const workspace = await workspaceService.create('test', 'test')
  const view = await workspaceService.syncWorkspaceView('testUser', workspace.id)
  const model = await getRepository(WorkspaceViewEntity).findOne(view.id)

  await getRepository(WorkspaceEntity).delete(workspace.id)
  await getRepository(WorkspaceViewEntity).delete(view.id)
  t.not(model, undefined)
})

test('getWorkspaceViewByViewId', async (t) => {
  const workspace = await workspaceService.create('test', 'test')
  const view = await workspaceService.syncWorkspaceView('testUser', workspace.id)

  const getViewRes = await workspaceService.getWorkspaceViewByViewId('testUser', view.id)

  await getRepository(WorkspaceEntity).delete(workspace.id)
  await getRepository(WorkspaceViewEntity).delete(view?.id)

  t.deepEqual(getViewRes.id, view.id)
})

function findMember(
  workspace: Workspace | WorkspaceDTO,
  userId: string,
): { role: PermissionWorkspaceRole; status: WorkspaceMemberStatus } | undefined {
  return _(workspace.members).find((m) => m.userId === userId)
}
