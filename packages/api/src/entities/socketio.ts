import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm'

/**
 * for socket.io
 */
@Entity({ name: 'socket_io_attachments' })
export class SocketIOAttachments extends BaseEntity {
  @PrimaryColumn('bigint')
  @Index({ unique: true })
  id!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @Column('bytea')
  payload!: object
}
