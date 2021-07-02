import { Column, Entity, Index } from 'typeorm'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'visits' })
@Index(['resourceId', 'lastVisitTimestamp'])
@Index(['userId', 'resourceId'], { unique: true })
export class VisitEntity extends TelleryBaseEntity {
  @Column()
  resourceId!: string

  @Column()
  userId!: string

  @Column('bigint')
  lastVisitTimestamp!: bigint
}
