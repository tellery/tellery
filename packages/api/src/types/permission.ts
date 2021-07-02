import { IsDefined, IsEnum } from 'class-validator'

// EntityRole
// the permission of user to resource
enum PermissionEntityRole {
  VIEWER = 'viewer',
  COMMENTATOR = 'commentator',
  EDITOR = 'editor',
  MANAGER = 'manager',
}

enum PermissionEntityRoleType {
  USER = 'user',
  // TODO: not support yet
  GROUP = 'group',
  WORKSPACE = 'workspace',
}

// EntityAction
// the action of user to resource
enum PermissionEntityAction {
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit',
  SHARE = 'share',
}

// WorkspaceRole
// the role of user in the workspace
enum PermissionWorkspaceRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

enum PermissionWorkspaceAction {
  MANAGE_WORKSPACE = 'manageWorkspace',
  MANAGE_GROUP = 'manageGroup',
  MANAGE_USER = 'manageUser',
  GET_WORKSPACE_DATA = 'getWorkspaceData',
  MANAGE_ENTITY = 'manageEntity',
}

class PermissionModel {
  @IsDefined()
  @IsEnum(PermissionEntityRole)
  role!: PermissionEntityRole

  @IsDefined()
  @IsEnum(PermissionEntityRoleType)
  type!: PermissionEntityRoleType

  id?: string
}

type PermissionsDTO = PermissionModel[]

const defaultPermissions = [
  { role: PermissionEntityRole.MANAGER, type: PermissionEntityRoleType.WORKSPACE },
]

function permissionForThoughtBlock(createdById?: string): PermissionModel[] {
  return [
    { role: PermissionEntityRole.MANAGER, type: PermissionEntityRoleType.USER, id: createdById },
  ]
}

export {
  PermissionsDTO,
  PermissionEntityRole,
  PermissionEntityRoleType,
  PermissionEntityAction,
  PermissionWorkspaceRole,
  PermissionWorkspaceAction,
  PermissionModel,
  defaultPermissions,
  permissionForThoughtBlock,
}
