import { Column, Entity, PrimaryColumn } from 'typeorm'

import { TelleryBaseWithoutIdEntity } from './base'

@Entity({ name: 'files' })
export class FileEntity extends TelleryBaseWithoutIdEntity {
  @PrimaryColumn()
  id!: string

  @Column('bytea')
  content!: Buffer

  @Column('jsonb')
  metadata!: Record<string, string | number | boolean>
}
