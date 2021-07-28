import _ from 'lodash'
import { WorkspaceEntity } from '../../entities/workspace'
import { InvalidArgumentError, NoPermissionsError } from '../../error/error'
import { PermissionWorkspaceRole } from '../../types/permission'
import { WorkspaceDTO } from '../../types/workspace'
import { absoluteURI, string2Hex } from '../../utils/common'
import { Common } from '../common'
import { WorkspaceMember } from './workspaceMember'

export class Workspace extends Common {
  id: string

  name: string

  members: WorkspaceMember[]

  avatar?: string

  inviteCode: string

  preferences: Object

  constructor(
    id: string,
    name: string,
    members: WorkspaceMember[],
    inviteCode: string,
    preferences: Object,
    version: number,
    avatar?: string,
    createdAt?: Date,
  ) {
    super(version, createdAt)
    this.id = id
    this.name = name
    this.members = members
    this.avatar = avatar
    this.inviteCode = inviteCode
    this.preferences = preferences
  }

  toModel(): WorkspaceEntity {
    const entity = new WorkspaceEntity()
    entity.id = this.id
    entity.name = this.name
    entity.avatar = this.avatar
    entity.members = _(this.members)
      .map((m) => m.toEntity())
      .value()
    entity.inviteCode = this.inviteCode
    entity.preferences = this.preferences
    return entity
  }

  toDTO(userId?: string): WorkspaceDTO {
    const me = _(this.members).find((m) => m.userId === userId)
    if (!me && userId) {
      throw NoPermissionsError.new()
    }
    const isAdmin = me?.role === PermissionWorkspaceRole.ADMIN
    // sort by joinAt desc
    const sortedMembers = _(this.members)
      .filter((m) => m.userId !== userId)
      .orderBy('joinAt', 'desc')
      .value()
    // push current user to the first
    if (me) {
      sortedMembers.unshift(me)
    }
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      members: sortedMembers,
      memberNum: this.members.length,
      inviteLink: isAdmin && userId ? this.getInviteLink(userId) : undefined,
      preferences: this.preferences,
      createdAt: this.createdAt?.getTime() || 0,
    }
  }

  getInviteLink(userId: string) {
    return absoluteURI(`/workspace/invite/${string2Hex(userId)}/${this.inviteCode}`)
  }

  static fromEntity(model: WorkspaceEntity): Workspace {
    return new Workspace(
      model.id,
      model.name,
      _(model.members)
        .map((m) => WorkspaceMember.fromEntity(m))
        .value(),
      model.inviteCode,
      model.preferences,
      model.version,
      model.avatar,
      model.createdAt,
    )
  }
}
