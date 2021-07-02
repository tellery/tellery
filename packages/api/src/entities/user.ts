import { Column, Entity, Index } from 'typeorm'
import { AccountStatus } from '../types/user'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'users' })
@Index('NAME_PG_TRGM_INDEX', { synchronize: false })
@Index('EMAIL_PG_TRGM_INDEX', { synchronize: false })
@Index(['email'], { unique: true })
export class UserEntity extends TelleryBaseEntity {
  @Column()
  username!: string

  @Column({
    unique: true,
  })
  email!: string

  @Column({ nullable: true })
  avatar?: string

  @Column()
  password!: string

  @Column({ enum: AccountStatus, default: AccountStatus.VERIFYING })
  status!: AccountStatus
}
