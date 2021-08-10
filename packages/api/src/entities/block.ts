/* eslint-disable @typescript-eslint/ban-types */
import { Column, Entity, Index, PrimaryColumn } from 'typeorm'

import { BlockParentType, BlockType } from '../types/block'
import { defaultPermissions, PermissionModel } from '../types/permission'
import { TelleryBaseWithoutIdEntity } from './base'

@Entity({ name: 'blocks' })
@Index(['storyId', 'alive'])
@Index(['type', 'alive'])
export default class BlockEntity extends TelleryBaseWithoutIdEntity {
  @PrimaryColumn()
  id!: string

  /**
   * used by internal search
   */
  @Column()
  @Index({ unique: true, where: `"type" = 'thought'` })
  interKey!: string

  @Column()
  @Index()
  workspaceId!: string

  @Column()
  storyId!: string

  @Column()
  parentId!: string

  @Column({ enum: BlockParentType })
  parentTable!: BlockParentType

  @Column({ enum: BlockType })
  type!: BlockType

  @Column('jsonb', { default: {} })
  content!: Object

  @Column('json', { nullable: true })
  format?: Object

  @Column('jsonb', { default: defaultPermissions })
  permissions!: PermissionModel[]

  /**
   * ids of sub blocks
   */
  @Column('varchar', { array: true, nullable: true })
  children?: string[]

  /**
   * ids of downstreaming assets
   */
  @Column('varchar', { array: true, nullable: true })
  resources?: string[]

  @Column({ nullable: true })
  searchableText?: string

  @Column({ default: true })
  alive!: boolean

  @Column({ nullable: true })
  createdById?: string

  @Column({ nullable: true })
  lastEditedById?: string
}
