import { Column, Entity, Index, JoinColumn, OneToMany } from 'typeorm'

import { TelleryBaseEntity } from './base'
import { WorkspaceMemberEntity } from './workspaceMember'

@Entity({ name: 'workspaces' })
export class WorkspaceEntity extends TelleryBaseEntity {
  @Column()
  name!: string

  @Column({ nullable: true })
  avatar?: string

  @OneToMany(() => WorkspaceMemberEntity, (member) => member.workspace, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'workspaceId' })
  members!: WorkspaceMemberEntity[]

  @Column()
  @Index({ unique: true })
  inviteCode!: string

  @Column('json', { default: {} })
  preferences!: Object
}
