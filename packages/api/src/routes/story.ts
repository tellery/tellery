import { plainToClass } from 'class-transformer'
import { IsDefined, ValidateNested } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import _ from 'lodash'
import { Block } from '../core/block'

import blockService from '../services/block'
import linkService from '../services/link'
import storyService from '../services/story'
import historyService from '../services/history'
import { LoadMoreKey } from '../types/common'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'

class GetStoryDetailRequest {
  @IsDefined()
  storyId!: string

  @IsDefined()
  workspaceId!: string
}

class GetStoryByTitleRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  title!: string
}

class GetStoryDetailByVersionIDRequest extends GetStoryDetailRequest {
  @IsDefined()
  versionId!: string
}

class SearchStoriesRequest {
  @IsDefined()
  keyword!: string

  createdBy?: string

  @IsDefined()
  workspaceId!: string

  @ValidateNested()
  next?: LoadMoreKey
}

class GetStoryVisitsRequest extends GetStoryDetailRequest {
  // -1 = all
  limit?: number
}

class ListStoryHistoryVersionsRequest extends GetStoryDetailRequest {
  @ValidateNested()
  next?: LoadMoreKey
}

class RestoreStoryByHistoryVersionIdRequest {
  @IsDefined()
  versionId!: string
}

async function loadStory(ctx: Context) {
  const payload = plainToClass(GetStoryDetailRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  await wrapLoadStoryBlocks(
    user.id,
    payload.workspaceId,
    () => blockService.listAccessibleBlocksByStoryId(user.id, payload.workspaceId, payload.storyId),
    ctx,
  )
}

async function loadStoryByHistoryVersionId(ctx: Context) {
  const payload = plainToClass(GetStoryDetailByVersionIDRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  await wrapLoadStoryBlocks(
    user.id,
    payload.workspaceId,
    () =>
      historyService.loadStoryHistoryContents(
        user.id,
        payload.workspaceId,
        payload.storyId,
        payload.versionId,
      ),
    ctx,
  )
}

async function searchStories(ctx: Context) {
  const payload = plainToClass(SearchStoriesRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const res = await storyService.search({
    workspaceId: payload.workspaceId,
    operatorId: user.id,
    keyword: payload.keyword,
    next: payload.next,
    createdBy: payload.createdBy,
  })
  ctx.body = res
}

async function recordVisit(ctx: Context) {
  const payload = plainToClass(GetStoryDetailRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const visit = await storyService.recordVisit(payload.workspaceId, user.id, payload.storyId)
  ctx.body = { visits: [visit] }
}

async function getVisits(ctx: Context) {
  const payload = plainToClass(GetStoryVisitsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const visits = await storyService.getVisits(
    payload.workspaceId,
    user.id,
    payload.storyId,
    payload.limit,
  )
  ctx.body = { visits }
}

async function getStoryHistoryVersions(ctx: Context) {
  const payload = plainToClass(ListStoryHistoryVersionsRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  ctx.body = await historyService.listStoryHistoryVersions(
    user.id,
    payload.workspaceId,
    payload.storyId,
    payload.next,
  )
}

async function restoreStory(ctx: Context) {
  const payload = plainToClass(RestoreStoryByHistoryVersionIdRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  await historyService.restoreStoryByHistoryId(user.id, payload.versionId)
  ctx.body = { success: true }
}

async function listByTitle(ctx: Context) {
  const payload = plainToClass(GetStoryByTitleRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  await wrapLoadStoryBlocks(
    user.id,
    payload.workspaceId,
    () => storyService.listByTitle(payload.workspaceId, user.id, payload.title),
    ctx,
  )
}

/**
 * get all linked content of the block
 */
async function wrapLoadStoryBlocks(
  operatorId: string,
  workspaceId: string,
  getBlocksInStory: () => Promise<Block[]>,
  ctx: Context,
): Promise<void> {
  const blocks = await getBlocksInStory()
  const links = _(blocks)
    .map((b) => b.getLinksFromContent())
    .flatMap()
    .uniq()
    .value()
  const linkedBlockDTOs = await linkService.mgetEntitiesByLinks(operatorId, workspaceId, links)
  const blockDtos = _(blocks)
    .map((b) => b.toDTO())
    .value()

  ctx.body = {
    blocks: _([blockDtos, linkedBlockDTOs]).flatMap().uniqBy('id').keyBy('id').value(),
  }
}

const router = new Router()

router.post('/load', loadStory)
router.post('/loadByVersionId', loadStoryByHistoryVersionId)
router.post('/search', searchStories)
router.post('/recordVisit', recordVisit)
router.post('/getVisits', getVisits)
router.post('/listByTitle', listByTitle)
router.post('/getHistoryVersions', getStoryHistoryVersions)
router.post('/restoreStory', restoreStory)

export default router
