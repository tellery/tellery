import test from 'ava'
import bluebird from 'bluebird'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { Workspace } from '../../src/core/workspace'
import { UserEntity } from '../../src/entities/user'
import { WorkspaceEntity } from '../../src/entities/workspace'
import { WorkspaceMemberEntity } from '../../src/entities/workspaceMember'
import { defaultUserService as userService } from '../../src/services/user'
import workspaceService from '../../src/services/workspace'
import { PermissionWorkspaceRole } from '../../src/types/permission'
import { AccountStatus } from '../../src/types/user'
import { WorkspaceDTO, WorkspaceMemberStatus } from '../../src/types/workspace'
import { mockUsers } from '../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('generate verifying user', async (t) => {
  const email = nanoid()
  await userService.generateUserVerification(email)
  await userService.generateUserVerification(email)

  const user = await getRepository(UserEntity).findOne({ email })

  t.not(user, null)
  t.is(user?.status, AccountStatus.VERIFYING)
  t.not(user?.avatar, undefined)
})

test('confirm user', async (t) => {
  const email = nanoid()
  const { code } = await userService.generateUserVerification(email)
  const confirmedUser = await userService.confirmUser(code!)

  t.is(confirmedUser.status, AccountStatus.CONFIRMED)
})

test('update user info', async (t) => {
  const { id: userId } = await userService.confirmUser(
    (
      await userService.generateUserVerification(nanoid())
    ).code!,
  )

  // user confirmed
  const user = await userService.updateUser(userId, {
    username: 'username',
    avatar: 'avatar',
    newPassword: 'newPassword',
    currentPassword: 'currentPassword',
  })

  t.is(user.username, 'username')
  t.is(user.status, AccountStatus.ACTIVE)
  t.is(user.password, userService.getConvertedPassword('newPassword', user.id))
})

test('inviteMembersWorkspace', async (t) => {
  const [inviter] = await mockUsers(1)
  const newWorkspace = await workspaceService.create(inviter.id, 'test-invite-members')
  const email = `${nanoid()}@test.com`
  // init user

  const pairs = await userService.inviteMembersToWorkspace(inviter.id, newWorkspace.id, [
    { email, role: PermissionWorkspaceRole.ADMIN },
  ])

  const workspace = await workspaceService.mustFindOneWithMembers(newWorkspace.id)
  const workspaceDTO = workspace.toDTO()

  const first = _(workspace.members).find((m) => m.userId !== inviter.id)
  t.is(workspaceDTO.memberNum, 2)
  t.is(first?.role, PermissionWorkspaceRole.ADMIN)
  // NOTE user status
  t.is(first?.status, WorkspaceMemberStatus.ACTIVE)

  t.not(
    pairs.find((r) => r.email === email),
    undefined,
  )
  const firstUser = await getRepository(UserEntity).findOne(first?.userId)
  // invited user status is confirmed
  t.is(firstUser?.status, AccountStatus.CREATING)

  const [invitee] = await mockUsers(1)
  // invite exist user
  await userService.inviteMembersToWorkspace(inviter.id, newWorkspace.id, [
    { email: invitee.email, role: PermissionWorkspaceRole.ADMIN },
  ])

  const res1 = (await workspaceService.mustFindOneWithMembers(newWorkspace.id)).toDTO()

  t.is(res1.memberNum, 3)
  t.is(findMember(res1, invitee.id)?.role, PermissionWorkspaceRole.ADMIN)
  // NOTE user status
  t.is(findMember(res1, invitee.id)?.status, WorkspaceMemberStatus.ACTIVE)
  await getRepository(UserEntity).delete({ email })
  await getRepository(UserEntity).delete([inviter.id, invitee.id])
  await getRepository(WorkspaceEntity).delete(newWorkspace.id)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: newWorkspace.id })
})

test('invite duplicate members', async (t) => {
  const [inviter] = await mockUsers(1)
  const workspace = await workspaceService.create(inviter.id, 'test-invite-duplicate')

  const email = `${nanoid()}@test.com`
  await userService.inviteMembersToWorkspace(inviter.id, workspace.id, [
    { email, role: PermissionWorkspaceRole.ADMIN },
  ])
  await bluebird.delay(100)
  await userService.inviteMembersToWorkspace(inviter.id, workspace.id, [
    { email, role: PermissionWorkspaceRole.ADMIN },
  ])

  const users = await getRepository(UserEntity).find({ email })
  t.is(users.length, 1)

  await getRepository(UserEntity).delete([inviter.id])
  await getRepository(WorkspaceEntity).delete(workspace.id)
  await getRepository(WorkspaceMemberEntity).delete({ workspaceId: workspace.id })
})

function findMember(
  workspace: Workspace | WorkspaceDTO,
  userId: string,
): { role: PermissionWorkspaceRole; status: WorkspaceMemberStatus } | undefined {
  return _(workspace.members).find((m) => m.userId === userId)
}
