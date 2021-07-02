import { Column, Entity, Generated, Index, ManyToOne } from 'typeorm'
import { PermissionWorkspaceRole } from '../types/permission'
import { WorkspaceMemberStatus } from '../types/workspace'

import { TelleryBaseEntity } from './base'
import { WorkspaceEntity } from './workspace'

@Entity({ name: 'workspace_members' })
@Index(['workspaceId', 'userId'], { unique: true })
export class WorkspaceMemberEntity extends TelleryBaseEntity {
  @Column()
  @Generated('uuid')
  workspaceId!: string

  @ManyToOne(() => WorkspaceEntity, (w) => w.members, {
    createForeignKeyConstraints: false,
  })
  workspace!: WorkspaceEntity

  @Column()
  @Index()
  userId!: string

  @Column({ enum: PermissionWorkspaceRole })
  role!: PermissionWorkspaceRole

  @Column()
  status!: WorkspaceMemberStatus

  @Column({ nullable: true })
  invitedAt?: Date

  @Column({ nullable: true })
  joinAt?: Date

  @Column({ nullable: true })
  invitedById?: string
}
