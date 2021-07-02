import { Column, Entity, Index, ManyToOne } from 'typeorm'
import { LinkType } from '../types/link'

import { TelleryBaseEntity } from './base'
import BlockEntity from './block'

@Entity({ name: 'links' })
@Index(['sourceBlockId', 'targetBlockId'], { unique: true })
export class LinkEntity extends TelleryBaseEntity {
  @Column()
  sourceBlockId!: string

  @Column()
  targetBlockId!: string

  @Column({
    type: 'enum',
    enum: LinkType,
  })
  type!: LinkType

  @Column({ default: true })
  sourceAlive!: boolean

  @Column({ default: true })
  targetAlive!: boolean

  @ManyToOne((_) => BlockEntity, {
    createForeignKeyConstraints: false,
  })
  sourceBlock!: BlockEntity

  @ManyToOne((_) => BlockEntity, {
    createForeignKeyConstraints: false,
  })
  targetBlock!: BlockEntity
}
