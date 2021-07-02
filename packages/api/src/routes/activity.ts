import { plainToClass } from 'class-transformer'
import { IsDefined, ValidateNested } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import activitySyncService from '../services/activitySync'
import activityService from '../services/activity'
import { SkipLoadMoreKey } from '../types/common'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'

class ListActivitiesRequest {
  @IsDefined()
  workspaceId!: string

  @ValidateNested()
  next?: SkipLoadMoreKey
}

const syncService = activitySyncService()

async function syncActivities(ctx: Context) {
  await syncService.syncWorkspaceActivities(ctx.request.body.workspaceId)
  ctx.body = { success: true }
}

async function listActivities(ctx: Context) {
  const payload = plainToClass(ListActivitiesRequest, ctx.request.body)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)

  const res = await activityService.list(user.id, payload.workspaceId, payload.next)

  ctx.body = res
}

const router = new Router()

router.post('/sync', syncActivities)
router.post('/list', listActivities)

export default router
