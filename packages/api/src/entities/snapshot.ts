import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { SqlQueryResult } from '../types/connector'

import { TelleryBaseWithoutIdEntity } from './base'

@Entity({ name: 'snapshots' })
@Index(['questionId'])
export class SnapshotEntity extends TelleryBaseWithoutIdEntity {
  @PrimaryColumn()
  id!: string

  @Column()
  questionId!: string

  @Column()
  sql!: string

  @Column('json')
  data!: SqlQueryResult

  @Column({ default: true })
  alive!: boolean

  @Column({ nullable: true })
  createdById?: string

  @Column({ nullable: true })
  lastEditedById?: string
}
