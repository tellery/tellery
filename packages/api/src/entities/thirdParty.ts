import { Column, Entity } from 'typeorm'

import { TelleryBaseEntity } from './base'

/**
 * configurations for third parties
 */
@Entity({ name: 'third_party_configurations' })
export class ThirdPartyConfigurationEntity extends TelleryBaseEntity {
  // third party type: 'metabase' or others
  @Column({ unique: true })
  type!: string

  @Column('json', { default: {} })
  config!: Record<string, unknown>
}
