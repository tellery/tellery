import _ from 'lodash'
import { nanoid } from 'nanoid'
import BlockEntity from '../../entities/block'
import { LinkEntity } from '../../entities/link'
import { LoadMoreKey } from '../../types/common'
import { StoryHistoryVersion } from '../../types/history'

export interface IHistoryStore {
  saveStoryBlocksAndLinks(
    operatorId: string,
    workspaceId: string,
    storyId: string,
    blocks: BlockEntity[],
    links: LinkEntity[],
  ): Promise<string>

  loadStoryHistoryVersions(
    workspaceId: string,
    storyId: string,
    next?: LoadMoreKey,
  ): Promise<StoryHistoryVersion[]>

  getStoryBlocksAndLinksByVersionId(versionId: string): Promise<{
    blocks: BlockEntity[]
    links: LinkEntity[]
  }>
}

export class TestHistoryStore implements IHistoryStore {
  private store = new Map<string, any>()

  async saveStoryBlocksAndLinks(
    operatorId: string,
    workspaceId: string,
    storyId: string,
    blocks: BlockEntity[],
    links: LinkEntity[],
  ): Promise<string> {
    const vid = nanoid()
    this.store.set(vid, {
      id: vid,
      storyId,
      workspaceId,
      contents: { blocks, links },
      createdById: operatorId,
      createdAt: _.now(),
    })
    return vid
  }

  async loadStoryHistoryVersions(
    _workspaceId: string,
    storyId: string,
  ): Promise<StoryHistoryVersion[]> {
    const res: StoryHistoryVersion[] = []
    this.store.forEach((v) => {
      if (v.storyId === storyId) {
        res.push(v)
      }
    })
    return _(res).sortBy('createdAt').reverse().value()
  }

  async getStoryBlocksAndLinksByVersionId(
    versionId: string,
  ): Promise<{ blocks: BlockEntity[]; links: LinkEntity[] }> {
    const { blocks, links } = this.store.get(versionId)?.contents
    return { blocks, links }
  }
}
