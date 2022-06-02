import _ from 'lodash'
import bluebird from 'bluebird'
import { FindManyOptions, getRepository, In } from 'typeorm'

import { Block } from '../core/block'
import { StoryBlock } from '../core/block/story'
import { LinkWithStoryId, loadLinkEntitiesByStoryIds } from '../core/link'
import { getIPermission, IPermission } from '../core/permission'
import { searchBlocksGroupByStory } from '../core/search'
import { getISearch, ISearch, SearchFilter } from '../core/search/interface'
import BlockEntity from '../entities/block'
import { VisitEntity } from '../entities/visit'
import { BlockType } from '../types/block'
import { LoadMoreKey } from '../types/common'
import { SearchedStoryDTO, StoryVisitsDTO } from '../types/story'
import { UserInfoDTO } from '../types/user'
import { mergeSearchFilters } from '../utils/common'
import { md5 } from '../utils/helper'
import { loadMore } from '../utils/loadMore'
import { canGetBlockData, canGetWorkspaceData } from '../utils/permission'
import userService from './user'
import { LinkType } from '../types/link'

export class StoryService {
  private permission: IPermission

  private iSearch: ISearch

  constructor(p: IPermission, s: ISearch) {
    this.permission = p
    this.iSearch = s
  }

  /**
   * TODO: move to /core/links, 同 questionService
   */
  async mgetLinks(
    operatorId: string,
    workspaceId: string,
    ids: string[],
  ): Promise<
    { storyId: string; forwardRefs: LinkWithStoryId[]; backwardRefs: LinkWithStoryId[] }[]
  > {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    // to ensure that following constructed sql well-formed
    if (ids.length === 0) {
      return []
    }

    const models = await loadLinkEntitiesByStoryIds(ids)

    // ignore models without permissions
    const filters = await bluebird.filter(models, async (m) => {
      const [source, target] = await Promise.all(
        _([m.sourceBlock, m.targetBlock])
          .map((b) =>
            canGetBlockData(this.permission, operatorId, workspaceId, b)
              .then(() => true)
              .catch(() => false),
          )
          .value(),
      )
      return source && target
    })

    return _(ids)
      .map((id) => ({
        storyId: id,
        forwardRefs: _(filters)
          .filter((m) => m.sourceBlock.storyId === id)
          .map((m) => ({
            storyId: m.targetBlock.storyId,
            blockId: m.targetBlock.id,
            type: m.type,
          }))
          .value(),
        backwardRefs: _(filters)
          .filter((m) => m.targetBlock.storyId === id)
          .map((m) => ({
            storyId: m.sourceBlock.storyId,
            blockId: m.sourceBlock.id,
            type: m.type,
          }))
          .value(),
      }))
      .value()
  }

  async search(options: {
    workspaceId: string
    operatorId: string
    createdBy?: string
    keyword: string
    next?: LoadMoreKey
  }): Promise<{ results: SearchedStoryDTO; next?: LoadMoreKey }> {
    const { workspaceId, operatorId, keyword, createdBy, next } = options
    const query = await this.permission.getSearchBlocksQuery(operatorId, workspaceId)

    const { limit = 20, timestamp = _.now() } = next ?? {}

    const hints = await searchBlocksGroupByStory(
      this.iSearch,
      keyword,
      mergeSearchFilters(
        [
          query,
          {
            query: (t: unknown) => `${t}.alive = :alive AND ${t}.updatedAt < :updatedAt`,
            parameters: {
              alive: true,
              updatedAt: new Date(timestamp),
            },
          },
          createdBy
            ? {
                query: (t: unknown) => `${t}.createdById = :createdById`,
                parameters: {
                  createdById: createdBy,
                },
              }
            : null,
        ].filter((x) => x !== null) as SearchFilter[],
      ),
      limit,
      0,
    )

    const searchedBlocks = _(hints).flatMap('blocks').map('value').uniqBy('id').value() as Block[]
    // key => blockId, value => highlight
    const highlights = _(hints)
      .flatMap('blocks')
      .keyBy('value.id')
      .mapValues('highlight')
      .value() as { [k: string]: string }
    const storyIds = _(hints).map('storyId').value() as string[]

    const diffedStoryBlocks = _(
      await getRepository(BlockEntity).find({
        id: In(_.difference(storyIds, _(searchedBlocks).map('id').value())),
      }),
    )
      .map((b) => Block.fromEntitySafely(b))
      .compact()
      .value()

    const storyBlocks = _([...diffedStoryBlocks, ...searchedBlocks])
      .uniqBy('id')
      .filter((b) => b.getType() === BlockType.STORY)
      .value()

    const [relateMap, users] = await Promise.all([
      this.getAllRelatedStories(storyIds),
      this.getAllCreatedByUsers(storyBlocks),
    ])

    const blocks = _([...searchedBlocks, ...diffedStoryBlocks, ..._(relateMap).values().value()])
      .flatMap()
      .compact()
      .uniqBy('id')
      .value()

    const { data: res, next: nextNext } = loadMore(
      storyIds,
      limit,
      (sid) => storyBlocks.find((s) => s.id === sid)?.updatedAt?.getTime() || 0,
    )

    _(blocks).forEach((b) => {
      if (!highlights[b.id]) {
        highlights[b.id] = b.getPlainText() ?? ''
      }
    })

    return {
      results: {
        blocks: _(blocks)
          .map((b) => b.toDTO())
          .keyBy('id')
          .value(),
        users: _(users).keyBy('id').value(),
        links: _(relateMap)
          .mapValues((b) => _(b).map('id').value())
          .value(),
        highlights,
        searchResults: res,
      },
      next: nextNext,
    }
  }

  async listByTitle(workspaceId: string, operatorId: string, title: string): Promise<StoryBlock[]> {
    const interKey = md5(title)

    const entities = await getRepository(BlockEntity).find({
      type: BlockType.STORY,
      alive: true,
      interKey,
    })
    return bluebird.map(entities, async (entity) => {
      await canGetBlockData(this.permission, operatorId, workspaceId, entity)
      return Block.fromEntity(entity) as StoryBlock
    })
  }

  /**
   * visible for testing
   * batch get all related story of stories
   * related story => bidirectional linked stories
   * @param ids: story id list
   * key: storyId
   */
  async getAllRelatedStories(ids: string[]): Promise<{ [k: string]: Block[] }> {
    // to ensure that the following constructed sql is well-formed
    if (ids.length === 0) {
      return {}
    }

    const linkModels = await loadLinkEntitiesByStoryIds(ids)

    const relateMap = _(ids)
      .map((id) => ({
        id,
        val: _(linkModels)
          .filter(
            (m) =>
              (m.sourceBlock.storyId === id || m.targetBlock.storyId === id) &&
              m.type === LinkType.BLOCK,
          )
          .map((m) =>
            m.sourceBlock.storyId === id ? m.targetBlock.storyId : m.sourceBlock.storyId,
          )
          .compact()
          .value(),
      }))
      .keyBy('id')
      .mapValues('val')
      .value()

    const storyModels = await getRepository(BlockEntity).find({
      id: In(_(relateMap).values().flatMap().value()),
    })
    return _(relateMap)
      .mapValues((relates) =>
        _(storyModels)
          .filter((m) => relates.includes(m.id))
          .map((m) => Block.fromEntity(m) as StoryBlock)
          .value(),
      )
      .value()
  }

  /**
   * visible for testing
   * batch get the list of creator of stories
   * key: userId
   */
  async getAllCreatedByUsers(stories: Block[]): Promise<UserInfoDTO[]> {
    return userService.getInfos(_(stories).map('createdById').compact().value())
  }

  async recordVisit(
    workspaceId: string,
    operatorId: string,
    storyId: string,
    timestamp = _.now(),
  ): Promise<StoryVisitsDTO> {
    await canGetBlockData(this.permission, operatorId, workspaceId, storyId)

    const v =
      (await getRepository(VisitEntity).findOne({ resourceId: storyId, userId: operatorId })) ||
      new VisitEntity()
    v.resourceId = storyId
    v.userId = operatorId
    v.lastVisitTimestamp = BigInt(timestamp)
    await v.save()

    return {
      storyId,
      userId: operatorId,
      lastVisitTimestamp: Number(v.lastVisitTimestamp),
    }
  }

  /**
   * get visited record of a story
   */
  async getVisits(
    workspaceId: string,
    operatorId: string,
    storyId: string,
    limit = 32,
  ): Promise<StoryVisitsDTO[]> {
    await canGetBlockData(this.permission, operatorId, workspaceId, storyId)

    const query: FindManyOptions = {
      where: { resourceId: storyId },
      order: { lastVisitTimestamp: 'DESC' },
    }
    if (limit > 0) {
      query.take = limit
    }

    const models = await getRepository(VisitEntity).find(query)
    return _(models)
      .map(({ resourceId, userId, lastVisitTimestamp }) => ({
        storyId: resourceId,
        userId,
        lastVisitTimestamp: Number(lastVisitTimestamp),
      }))
      .value()
  }
}

const service = new StoryService(getIPermission(), getISearch())

export default service
