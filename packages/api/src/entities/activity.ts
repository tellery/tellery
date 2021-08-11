/* eslint-disable @typescript-eslint/ban-types */
import { Column, Entity, Index } from 'typeorm'
import { ActivityCommandType, ActivityResourceType } from '../types/activity'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'activities' })
@Index(['activityListId', 'resourceId'])
export class ActivityEntity extends TelleryBaseEntity {
  @Column()
  activityListId!: string

  @Column()
  resourceId!: string

  @Column()
  workspaceId!: string

  @Column({ enum: ActivityResourceType })
  resourceType!: ActivityResourceType

  @Column()
  operatorId!: string

  @Column({ enum: ActivityCommandType })
  cmd!: ActivityCommandType

  @Column('bigint')
  timestamp!: bigint

  @Column('json', { nullable: true })
  before?: Object

  @Column('json', { nullable: true })
  after?: Object
}
