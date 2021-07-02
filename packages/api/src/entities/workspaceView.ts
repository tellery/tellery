import { Column, Entity, Index } from 'typeorm'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'workspace_views' })
@Index(['workspaceId', 'userId'], { unique: true })
export class WorkspaceViewEntity extends TelleryBaseEntity {
  @Column()
  workspaceId!: string

  @Column()
  userId!: string

  @Column('varchar', { array: true, default: [] })
  pinnedList!: string[]
}
