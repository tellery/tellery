import { Column, Entity } from 'typeorm'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'files' })
export class FileEntity extends TelleryBaseEntity {
  @Column()
  key!: string

  @Column()
  hash!: string

  @Column()
  bucket!: string

  @Column()
  size!: number

  @Column({ nullable: true })
  name?: string

  @Column({ nullable: true })
  ext?: string

  @Column({ nullable: true })
  mimeType?: string

  @Column('json', { nullable: true })
  imageInfo?: {
    format: string
    width: number
    height: number
    [key: string]: unknown
  }
}
