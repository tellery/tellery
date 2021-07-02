import { plainToClass } from 'class-transformer'
import { IsArray, IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { NotificationOpt } from '../../clients/socket/interface'

import { validate } from '../../utils/http'
import { getNotificationService } from './story'

class SendNotificationRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  operatorId!: string

  @IsArray()
  @IsDefined()
  entities!: NotificationOpt[]
}

/**
 * sync user info by email
 */
async function sendEntitiesChangedNotification(ctx: Context) {
  const payload = plainToClass(SendNotificationRequest, ctx.request.body)
  await validate(ctx, payload)

  const { workspaceId, operatorId, entities: opts } = payload
  await getNotificationService().sendUpdateEntityEvent(workspaceId, operatorId, opts)
  ctx.body = { success: true }
}

const router = new Router()

router.post('/sendEntitiesChangedNotification', sendEntitiesChangedNotification)

export default router
