import { Column, Entity } from 'typeorm'
import { AuthData, AuthType } from '../types/auth'

import { TelleryBaseEntity } from './base'

@Entity({ name: 'connectors' })
export class ConnectorEntity extends TelleryBaseEntity {
  @Column()
  workspaceId!: string

  @Column({ enum: AuthType })
  authType!: AuthType

  @Column('json')
  authData!: AuthData

  @Column()
  url!: string

  @Column()
  name!: string

  @Column({ default: true })
  alive!: boolean
}
