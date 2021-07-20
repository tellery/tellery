import _ from 'lodash'
import { getRepository, LessThan } from 'typeorm'
import { IHistoryStore } from '.'
import BlockEntity from '../../entities/block'
import StoryHistoryEntity from '../../entities/history'
import { LinkEntity } from '../../entities/link'
import { LoadMoreKey } from '../../types/common'
import { StoryHistoryVersion } from '../../types/history'

export class PgHistoryStore implements IHistoryStore {
  async saveStoryBlocksAndLinks(
    operatorId: string,
    workspaceId: string,
    storyId: string,
    blocks: BlockEntity[],
    links: LinkEntity[],
  ): Promise<string> {
    const insertRes = await getRepository(StoryHistoryEntity)
      .create({
        storyId,
        workspaceId,
        contents: { blocks, links },
        createdById: operatorId,
      })
      .save()
    return insertRes.id
  }

  async loadStoryHistoryVersions(
    workspaceId: string,
    storyId: string,
    next?: LoadMoreKey,
  ): Promise<StoryHistoryVersion[]> {
    const { limit = 20, timestamp = _.now() } = next ?? {}

    const entities = await getRepository(StoryHistoryEntity).find({
      select: ['id', 'storyId', 'workspaceId', 'createdAt'],
      where: {
        workspaceId,
        storyId,
        createdAt: LessThan(new Date(timestamp)),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    })

    return _(entities)
      .map((m) => this.convertStoryHistoryEntity(m))
      .value()
  }

  async getStoryBlocksAndLinksByVersionId(versionId: string): Promise<{
    blocks: BlockEntity[]
    links: LinkEntity[]
  }> {
    const history = await getRepository(StoryHistoryEntity).findOneOrFail(versionId)
    return history.contents
  }

  private convertStoryHistoryEntity(entity: StoryHistoryEntity): StoryHistoryVersion {
    return {
      id: entity.id,
      storyId: entity.storyId,
      workspaceId: entity.workspaceId,
      createdById: entity.createdById,
      createdAt: entity.createdAt?.getTime() ?? 0,
    }
  }
}
