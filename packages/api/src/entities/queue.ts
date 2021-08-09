import { Column, Entity, Generated, Index, PrimaryColumn } from 'typeorm'

import { TelleryBaseWithoutIdEntity } from './base'

@Entity({ name: 'queue' })
@Index(['key', 'deleted'])
export class QueueEntity extends TelleryBaseWithoutIdEntity {
  @PrimaryColumn()
  @Generated('increment')
  id!: number

  @Column()
  key!: string

  @Column('json')
  object!: unknown

  @Column({ default: false })
  deleted!: boolean
}
