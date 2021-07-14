import _ from 'lodash'

import BlockEntity from '../../entities/block'
import {
  PermissionEntityAction,
  PermissionEntityRole,
  PermissionEntityRoleType,
} from '../../types/permission'

export function getPermissionEntityActionsByRole(
  role: PermissionEntityRole,
): PermissionEntityAction[] {
  switch (role) {
    case PermissionEntityRole.VIEWER:
      return [PermissionEntityAction.VIEW]
    case PermissionEntityRole.COMMENTATOR:
      return appendActionsByRole(PermissionEntityRole.VIEWER, PermissionEntityAction.COMMENT)
    case PermissionEntityRole.EDITOR:
      return appendActionsByRole(PermissionEntityRole.COMMENTATOR, PermissionEntityAction.EDIT)
    case PermissionEntityRole.MANAGER:
      return Object.values(PermissionEntityAction)
    default:
      return []
  }
}

function appendActionsByRole(
  role: PermissionEntityRole,
  ...actions: PermissionEntityAction[]
): PermissionEntityAction[] {
  return _([...getPermissionEntityActionsByRole(role), ...actions])
    .uniq()
    .value()
}

/**
 * the role of a user in block permission
 */
export function getRoleInStory(
  operatorId: string,
  block: BlockEntity,
): PermissionEntityRole | undefined {
  const userRole = _(block.permissions).find(
    (permission) => _(permission).get('id') === operatorId,
  )?.role
  const workspaceRole = _(block.permissions).find(
    (permission) => permission.type === PermissionEntityRoleType.WORKSPACE,
  )?.role
  return userRole ?? workspaceRole
}
