import test from 'ava'
import { getPermissionEntityActionsByRole } from '../../../src/core/permission/entity'
import { PermissionEntityAction, PermissionEntityRole } from '../../../src/types/permission'

test('getPermissionEntityActionsByRole', (t) => {
  const actions1 = getPermissionEntityActionsByRole(PermissionEntityRole.EDITOR)
  t.deepEqual(actions1, [
    PermissionEntityAction.VIEW,
    PermissionEntityAction.COMMENT,
    PermissionEntityAction.EDIT,
  ])
  const actions2 = getPermissionEntityActionsByRole(PermissionEntityRole.COMMENTATOR)
  t.deepEqual(actions2, [PermissionEntityAction.VIEW, PermissionEntityAction.COMMENT])
  const actions3 = getPermissionEntityActionsByRole(PermissionEntityRole.MANAGER)
  t.deepEqual(actions3, [
    PermissionEntityAction.VIEW,
    PermissionEntityAction.COMMENT,
    PermissionEntityAction.EDIT,
    PermissionEntityAction.SHARE,
  ])
})
