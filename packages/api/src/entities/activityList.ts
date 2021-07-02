import { Column, Entity, Index } from 'typeorm'
import { ActivityCommandType, ActivityResourceType } from '../types/activity'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'activity_list' })
@Index(['workspaceId', 'resourceId', 'resourceType', 'startTimestamp'])
@Index(['workspaceId', 'startTimestamp'])
export class ActivityListEntity extends TelleryBaseEntity {
  @Column()
  workspaceId!: string

  @Column()
  resourceId!: string

  @Column({ enum: ActivityResourceType })
  resourceType!: ActivityResourceType

  @Column({ enum: ActivityCommandType })
  resourceCmd!: ActivityCommandType

  @Column('bigint')
  startTimestamp!: bigint
}
