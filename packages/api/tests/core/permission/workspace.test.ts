import test from 'ava'
import { getPermissionWorkspaceActionsByRole } from '../../../src/core/permission/workspace'
import { PermissionWorkspaceAction, PermissionWorkspaceRole } from '../../../src/types/permission'

test('getPermissionWorkspaceActionsByRole', (t) => {
  const actions1 = getPermissionWorkspaceActionsByRole(PermissionWorkspaceRole.ADMIN)
  t.deepEqual(actions1, [
    PermissionWorkspaceAction.MANAGE_WORKSPACE,
    PermissionWorkspaceAction.MANAGE_GROUP,
    PermissionWorkspaceAction.MANAGE_USER,
    PermissionWorkspaceAction.GET_WORKSPACE_DATA,
    PermissionWorkspaceAction.MANAGE_ENTITY,
  ])
  const actions2 = getPermissionWorkspaceActionsByRole(PermissionWorkspaceRole.MEMBER)
  t.deepEqual(actions2, [
    PermissionWorkspaceAction.GET_WORKSPACE_DATA,
    PermissionWorkspaceAction.MANAGE_ENTITY,
  ])
})
