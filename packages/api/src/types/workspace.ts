import { PermissionWorkspaceRole } from './permission'

export type WorkspaceGroup = {
  // group id
  id: string
  // group name
  name: string
  // user ids
  members: string[]
}

export type WorkspaceDTO = {
  id: string
  name: string
  avatar?: string
  // only visible to admin
  inviteLink?: string
  members: { userId: string; role: PermissionWorkspaceRole; status: WorkspaceMemberStatus }[]
  preferences: WorkspacePreferences
  memberNum: number
  createdAt: number
}

export enum WorkspaceMemberStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
}

export type WorkspacePreferences = {
  // current connector Id
  connectorId?: string
  // current profile
  profile?: string
}
