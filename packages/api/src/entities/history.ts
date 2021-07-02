import { Column, Entity } from 'typeorm'

import { TelleryBaseEntity } from './base'
import BlockEntity from './block'
import { LinkEntity } from './link'

@Entity({ name: 'story_histories' })
export default class StoryHistoryEntity extends TelleryBaseEntity {
  @Column()
  storyId!: string

  @Column()
  workspaceId!: string

  @Column('jsonb')
  contents!: { blocks: BlockEntity[]; links: LinkEntity[] }

  @Column()
  createdById!: string
}
