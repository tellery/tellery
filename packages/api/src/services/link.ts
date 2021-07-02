import _ from 'lodash'
import { Link, LinkWithStoryId } from '../core/link'

import storyService from './story'
import blockService from './block'
import { BlockDTO } from '../types/block'

export class LinkService {
  async mgetEntitiesByLinks(
    operatorId: string,
    workspaceId: string,
    links: Link[],
  ): Promise<BlockDTO[]> {
    const blockIds = _(links)
      .map((l) => l.blockId)
      .compact()
      .uniq()
      .value()

    return blockService.mget(operatorId, workspaceId, blockIds)
  }

  async mgetBlockLinks(operatorId: string, workspaceId: string, ids: string[]) {
    return this.mgetLinks(
      operatorId,
      workspaceId,
      _(ids)
        .map((id) => ({
          blockId: id,
        }))
        .value(),
    )
  }

  async mgetLinks(
    operatorId: string,
    workspaceId: string,
    ids: { storyId?: string; blockId?: string }[],
  ): Promise<
    (
      | {
          id: string
          blockId: string
          forwardRefs: LinkWithStoryId[]
          backwardRefs: LinkWithStoryId[]
        } // id = blockId
      | {
          id: string
          storyId: string
          forwardRefs: LinkWithStoryId[]
          backwardRefs: LinkWithStoryId[]
        } // id = storyId
    )[]
  > {
    const sids = _(ids).map('storyId').compact().value()
    const bids = _(ids).map('blockId').compact().value()

    const [sLinks, bLinks] = await Promise.all([
      storyService.mgetLinks(operatorId, workspaceId, sids),
      blockService.mgetLinks(operatorId, workspaceId, bids),
    ])

    return [
      ..._(sLinks)
        .map((v) => ({ id: v.storyId, ...v }))
        .value(),
      ..._(bLinks)
        .map((v) => ({ id: v.blockId, ...v }))
        .value(),
    ]
  }
}

const service = new LinkService()
export default service
