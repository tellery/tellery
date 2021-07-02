import _ from 'lodash'
import { WorkspaceEntity } from '../../entities/workspace'
import { PermissionWorkspaceAction, PermissionWorkspaceRole } from '../../types/permission'

export function getPermissionWorkspaceActionsByRole(
  role: PermissionWorkspaceRole,
): PermissionWorkspaceAction[] {
  if (role === PermissionWorkspaceRole.MEMBER) {
    return [PermissionWorkspaceAction.GET_WORKSPACE_DATA, PermissionWorkspaceAction.MANAGE_ENTITY]
  }
  if (role === PermissionWorkspaceRole.ADMIN) {
    return Object.values(PermissionWorkspaceAction)
  }
  return []
}

/**
 * the role of a user in workspace
 */
export function getRoleInWorkspace(
  operatorId: string,
  workspace: WorkspaceEntity,
): PermissionWorkspaceRole | undefined {
  return _(workspace.members).find((member) => member.userId === operatorId)?.role
}
