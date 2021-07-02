import { IPermission } from '../core/permission'
import BlockEntity from '../entities/block'
import { WorkspaceEntity } from '../entities/workspace'
import { NoPermissionsError } from '../error/error'

export async function canGetWorkspaceData(
  ipv: IPermission,
  operatorId: string,
  workspace: string | WorkspaceEntity,
): Promise<void> {
  if (!(await ipv.canGetWorkspaceData(operatorId, workspace))) {
    throw NoPermissionsError.new()
  }
}
/**
 * Note: member invitation is considered as updating workspace data
 */
export async function canUpdateWorkspaceData(
  ipv: IPermission,
  operatorId: string,
  workspace: string | WorkspaceEntity,
): Promise<void> {
  if (!(await ipv.canUpdateWorkspaceData(operatorId, workspace))) {
    throw NoPermissionsError.new()
  }
}

export async function canUpdateGroupData(
  ipv: IPermission,
  operatorId: string,
  workspace: string | WorkspaceEntity,
) {
  return canUpdateWorkspaceData(ipv, operatorId, workspace)
}

export async function canGetBlockData(
  ipv: IPermission,
  operatorId: string,
  workspace: string | WorkspaceEntity,
  block: string | BlockEntity,
): Promise<void> {
  await canGetWorkspaceData(ipv, operatorId, workspace)

  if (!(await ipv.canGetBlockData(operatorId, block))) {
    throw NoPermissionsError.new()
  }
}

export async function canUpdateBlockData(
  ipv: IPermission,
  operatorId: string,
  workspace: string | WorkspaceEntity,
  block: string | BlockEntity,
): Promise<void> {
  await canGetWorkspaceData(ipv, operatorId, workspace)

  if (!(await ipv.canUpdateBlockData(operatorId, block))) {
    throw NoPermissionsError.new()
  }
}
