import _ from 'lodash'
import { getManager, In } from 'typeorm'

import { Block } from '../core/block'
import { IHistoryStore } from '../core/history'
import { PgHistoryStore } from '../core/history/database'
import { loadLinkEntitiesByStoryIds } from '../core/link'
import { getIPermission, IPermission } from '../core/permission'
import BlockEntity from '../entities/block'
import { LinkEntity } from '../entities/link'
import { InternalError, NotFoundError } from '../error/error'
import { LoadMoreKey } from '../types/common'
import { StoryHistoryVersion } from '../types/history'
import { loadMore } from '../utils/loadMore'
import { canGetBlockData, canUpdateBlockData } from '../utils/permission'
import blockService from './block'

export class HistoryService {
  private permission: IPermission

  private store: IHistoryStore

  constructor(permission: IPermission, store: IHistoryStore) {
    this.permission = permission
    this.store = store
  }

  async dumpAndSaveStory(
    operatorId: string,
    workspaceId: string,
    storyId: string,
  ): Promise<string> {
    // TODO: resolve conflicts
    const [blocks, links] = await Promise.all([
      blockService.listEntitiesByStoryId(storyId, true),
      loadLinkEntitiesByStoryIds([storyId]),
    ])
    return this.store.saveStoryBlocksAndLinks(operatorId, workspaceId, storyId, blocks, links)
  }

  async listStoryHistoryVersions(
    operatorId: string,
    workspaceId: string,
    storyId: string,
    next?: LoadMoreKey,
  ): Promise<{ versions: StoryHistoryVersion[]; next?: LoadMoreKey }> {
    const loadMoreKey = next || { timestamp: _.now(), limit: 20 }
    const { limit = 20 } = loadMoreKey

    await canGetBlockData(this.permission, operatorId, workspaceId, storyId)

    const dtos = await this.store.loadStoryHistoryVersions(workspaceId, storyId, next)

    const { data: versions, next: nextNext } = loadMore(dtos, limit, (q) => q.createdAt)

    return {
      versions,
      next: nextNext,
    }
  }

  async loadStoryHistoryContents(
    operatorId: string,
    workspaceId: string,
    storyId: string,
    id: string,
  ): Promise<Block[]> {
    await canGetBlockData(this.permission, operatorId, workspaceId, storyId)

    const { blocks } = await this.store.getStoryBlocksAndLinksByVersionId(id)
    return _(blocks)
      .map((b) => Block.fromEntity(b))
      .value()
  }

  /**
   * restore the history of a story
   * @param id: history version id
   * @returns
   */
  async restoreStoryByHistoryId(operatorId: string, id: string): Promise<void> {
    const { blocks, links } = await this.store.getStoryBlocksAndLinksByVersionId(id)
    // empty blocks means corrupted data
    if (_(blocks).isEmpty()) {
      throw NotFoundError.resourceNotFound(id)
    }
    const first = _(blocks).find((b) => !!b.workspaceId)
    if (!first) {
      throw InternalError.new('invalid blocks')
    }
    const { storyId } = first
    await canUpdateBlockData(this.permission, operatorId, first.workspaceId!, storyId)

    return getManager().transaction(async (t) => {
      const bs = t.getRepository(BlockEntity)
      const ls = t.getRepository(LinkEntity)
      // hard delete all links of the story
      const linkEntities = await loadLinkEntitiesByStoryIds([storyId], {
        loadAll: true,
        manager: t,
      })
      const lids = _(linkEntities).map('id').value()

      // hard delete all blocks of the story
      await bs.delete({ storyId })
      await bs.insert(blocks)

      if (!_(lids).isEmpty()) {
        await ls.delete(lids)
      }
      // check if blocks of links are alive, and update corresponding alive field
      const bids = _(links)
        .flatMap((l) => [l.sourceBlockId, l.targetBlockId])
        .uniq()
        .value()
      const linkedBlocks = await bs.find({ id: In(bids) })
      for (let i = 0; i < links.length; i++) {
        const l = links[i]
        l.sourceAlive = _(linkedBlocks).find((b) => b.id === l.sourceBlockId)?.alive ?? false
        l.targetAlive = _(linkedBlocks).find((b) => b.id === l.targetBlockId)?.alive ?? false
      }
      await ls.insert(links)
    })
  }
}

const service = new HistoryService(getIPermission(), new PgHistoryStore())

export default service
