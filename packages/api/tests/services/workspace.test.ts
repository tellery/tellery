import test from 'ava'
import bluebird from 'bluebird'
import _, { filter } from 'lodash'
import { getRepository, In } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { FakePermission } from '../../src/core/permission'
import { UserEntity } from '../../src/entities/user'
import { WorkspaceEntity } from '../../src/entities/workspace'
import { WorkspaceMemberEntity } from '../../src/entities/workspaceMember'
import { WorkspaceViewEntity } from '../../src/entities/workspaceView'
import { WorkspaceService } from '../../src/services/workspace'
import { PermissionWorkspaceRole } from '../../src/types/permission'
import { WorkspaceMemberStatus } from '../../src/types/workspace'
import { mockUsers, uuid } from '../testutils'

class TestPermission extends FakePermission {
  async getListWorkspacesQuery(operatorId: string): Promise<{ [k: string]: any }> {
    const ids = _(
      await getRepository(WorkspaceMemberEntity).find({
        select: ['workspaceId'],
        where: {
          userId: operatorId,
        },
      }),
    )
      .map('workspaceId')
      .value()
    return {
      id: In(ids),
    }
  }
}

const workspaceService = new WorkspaceService(new TestPermission())

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
  const workspace = await workspaceService.create(uid, 'test-create')
  t.is(workspace.memberNum, 1)
  t.is(workspace.name, 'test-create')
  t.not(workspace.id, null)
  t.not(workspace.avatar, undefined)

  const model = await getRepository(WorkspaceEntity).findOne(workspace.id)
  t.not(model, undefined)
  t.is((model?.inviteCode?.length ?? 0) > 0, true)

  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('listWorkspaces', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test-list')
  const res1 = await workspaceService.list(uid)
  t.is(res1.workspaces.length > 0, true)
  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('getWorkspace', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test-get')

  const res = await workspaceService.get(uid, workspace.id)

  t.deepEqual(res.id, workspace.id)
  t.deepEqual(res.members[0].userId, uid)

  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('updateWorkspace', async (t) => {
  const uid = uuid()
  const workspace = await workspaceService.create(uid, 'test-update')
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
  const workspace = await workspaceService.create(uid1, 'test-join')
  const res = await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  t.is(res.memberNum, 2)
  const res2 = await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  t.is(res2.memberNum, 2)

  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: res.id })
  await getRepository(WorkspaceEntity).delete(res.id)
})

test('sort user members', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()
  const uid3 = uuid()
  const workspace = await workspaceService.create(uid1, 'test-sort')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  await workspaceService.join(workspace.id, uid3, await getInviteCode(workspace.id))
  await bluebird.delay(200)

  const w = await workspaceService.get(uid1, workspace.id)
  // desc order by joinAt
  // uid1 in the very beginning
  t.deepEqual(_(w.members).map('userId').value(), [uid1, uid3, uid2])

  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: w.id })
  await getRepository(WorkspaceEntity).delete(w.id)
})

test('leaveWorkspace', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()

  const workspace = await workspaceService.create(uid1, 'test-leave')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))

  await workspaceService.leave(workspace.id, uid2)
  const model1 = await workspaceService.mustFindOneWithMembers(workspace.id)
  t.is(model1?.members.length, 1)

  await workspaceService.leave(workspace.id, uid1)
  // workspace should be deleted
  const model2 = await getRepository(WorkspaceEntity).findOne(workspace.id)
  await bluebird.delay(200)
  t.is(model2, undefined)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: workspace.id })
  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('add members', async (t) => {
  const [inviter, invitee] = await mockUsers(2)
  const newWorkspace = await workspaceService.create(inviter.id, 'test-add-members')
  await workspaceService.addMembers(inviter.id, newWorkspace.id, [
    { userId: invitee.id, role: PermissionWorkspaceRole.MEMBER },
  ])
  const res0 = (await workspaceService.mustFindOneWithMembers(newWorkspace.id)).toDTO()
  const first = _(res0.members).find((m) => m.userId !== inviter.id)
  t.is(res0.memberNum, 2)
  t.is(first?.userId, invitee.id)
  t.is(first?.role, PermissionWorkspaceRole.MEMBER)
  t.is(first?.status, WorkspaceMemberStatus.ACTIVE)
  await getRepository(UserEntity).delete([inviter.id, invitee.id])
  await getRepository(WorkspaceEntity).delete(newWorkspace.id)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: newWorkspace.id })
})

test('add duplicate members', async (t) => {
  const [inviter, invitee] = await mockUsers(2)
  const newWorkspace = await workspaceService.create(inviter.id, 'test-add-members')
  await workspaceService.addMembers(inviter.id, newWorkspace.id, [
    { userId: invitee.id, role: PermissionWorkspaceRole.MEMBER },
  ])
  await bluebird.delay(100)
  await workspaceService.addMembers(inviter.id, newWorkspace.id, [
    { userId: invitee.id, role: PermissionWorkspaceRole.MEMBER },
  ])
  const res0 = (await workspaceService.mustFindOneWithMembers(newWorkspace.id)).toDTO()
  t.is(res0.memberNum, 2)
  await getRepository(UserEntity).delete([inviter.id, invitee.id])
  await getRepository(WorkspaceEntity).delete(newWorkspace.id)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: newWorkspace.id })
})

test('kickout members', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()
  const uid3 = uuid()

  const workspace = await workspaceService.create(uid1, 'test-kickout')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))
  await workspaceService.join(workspace.id, uid3, await getInviteCode(workspace.id))

  await workspaceService.kickoutMembers(uid1, workspace.id, [uid2, uid3])
  await bluebird.delay(200)
  const model = await workspaceService.mustFindOneWithMembers(workspace.id)
  t.is(model?.members.length, 1)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: workspace.id })
  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('updateRoleWorkspace', async (t) => {
  const uid1 = uuid()
  const uid2 = uuid()
  const workspace = await workspaceService.create(uid1, 'test-update-role')
  await workspaceService.join(workspace.id, uid2, await getInviteCode(workspace.id))

  const model1 = await workspaceService.mustFindOneWithMembers(workspace.id)

  const before = filter(model1?.members, (val) => val.userId === uid2)[0]
  t.deepEqual(before.role, PermissionWorkspaceRole.MEMBER)

  await workspaceService.updateRole(uid1, workspace.id, uid2, PermissionWorkspaceRole.ADMIN)

  const model2 = await workspaceService.mustFindOneWithMembers(workspace.id)
  const after = filter(model2?.members, (val) => val.userId === uid2)[0]
  t.deepEqual(after.role, PermissionWorkspaceRole.ADMIN)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: workspace.id })
  await getRepository(WorkspaceEntity).delete(workspace.id)
})

test('getWorkspaceView', async (t) => {
  const workspace = await workspaceService.create('test', 'test-getView')
  const view = await workspaceService.syncWorkspaceView('testUser', workspace.id)
  const model = await getRepository(WorkspaceViewEntity).findOne(view.id)

  await getRepository(WorkspaceEntity).delete(workspace.id)
  await getRepository(WorkspaceViewEntity).delete(view.id)
  t.not(model, undefined)
})

test('getWorkspaceViewByViewId', async (t) => {
  const workspace = await workspaceService.create('test', 'test-getViewById')
  const view = await workspaceService.syncWorkspaceView('testUser', workspace.id)

  const getViewRes = await workspaceService.getWorkspaceViewByViewId('testUser', view.id)

  await getRepository(WorkspaceEntity).delete(workspace.id)
  await getRepository(WorkspaceViewEntity).delete(view?.id)

  t.deepEqual(getViewRes.id, view.id)
})
