import { WorkspaceMemberEntity } from '../../entities/workspaceMember'
import { PermissionWorkspaceRole } from '../../types/permission'
import { WorkspaceMemberStatus } from '../../types/workspace'
import { Common } from '../common'

export class WorkspaceMember extends Common {
  id: string

  workspaceId: string

  userId: string

  role: PermissionWorkspaceRole

  status: WorkspaceMemberStatus

  invitedAt?: Date

  joinAt?: Date

  invitedById?: string

  constructor(
    id: string,
    workspaceId: string,
    userId: string,
    role: PermissionWorkspaceRole,
    status: WorkspaceMemberStatus,
    version: number,
    invitedAt?: Date,
    joinAt?: Date,
    invitedById?: string,
    createdAt?: Date,
  ) {
    super(version, createdAt)
    this.id = id
    this.workspaceId = workspaceId
    this.userId = userId
    this.role = role
    this.status = status
    this.invitedAt = invitedAt
    this.joinAt = joinAt
    this.invitedById = invitedById
  }

  static fromEntity(entity: WorkspaceMemberEntity): WorkspaceMember {
    return new WorkspaceMember(
      entity.id,
      entity.workspaceId,
      entity.userId,
      entity.role,
      entity.status,
      entity.version,
      entity.invitedAt,
      entity.joinAt,
      entity.invitedById,
      entity.createdAt,
    )
  }

  toEntity(): WorkspaceMemberEntity {
    const entity = new WorkspaceMemberEntity()
    entity.id = this.id
    entity.workspaceId = this.workspaceId
    entity.userId = this.userId
    entity.role = this.role
    entity.status = this.status
    entity.invitedAt = this.invitedAt
    entity.joinAt = this.joinAt
    entity.invitedById = this.invitedById
    return entity
  }
}
