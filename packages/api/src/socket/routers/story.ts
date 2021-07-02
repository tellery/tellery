import bluebird from 'bluebird'
import { plainToClass } from 'class-transformer'
import { IsDefined, IsEnum, IsObject } from 'class-validator'
import { Server, Socket } from 'socket.io'

import { BroadCastArgs, BroadCastEvent, OnEventType } from '../../types/socket'
import { validate } from '../../utils/socket'
import { NotificationService } from '../services/notification'
import activitySyncServiceConstructor from '../../services/activitySync'

class OnEventRequest {
  @IsDefined()
  @IsEnum(OnEventType)
  type!: OnEventType

  @IsDefined()
  @IsObject()
  value!: { storyId: string }
}

class BroadCastRequest {
  @IsDefined()
  @IsEnum(BroadCastEvent)
  event!: BroadCastEvent

  @IsDefined()
  @IsObject()
  args!: BroadCastArgs
}

let notificationService: NotificationService

export function init(io: Server) {
  const workspaceIO = io.of('/workspace')
  notificationService = new NotificationService(workspaceIO)
  const activityService = activitySyncServiceConstructor()

  workspaceIO.on('connection', async (socket: Socket) => {
    const { workspaceId, userId: operatorId } = socket.handshake.query
    const sessionId = socket.id
    const wid = workspaceId as string
    const oid = operatorId as string

    await notificationService.storeUserIdAndSocketId(sessionId, oid)

    // join room
    await notificationService.enterWorkspace(socket, wid)

    socket.on('broadcast', async (msg) => {
      const payload = plainToClass(BroadCastRequest, msg)
      return validate(payload).then(() => broadcast(notificationService, wid, payload))
    })

    socket.on('event', async (msg) => {
      const payload = plainToClass(OnEventRequest, msg)
      return validate(payload).then(() => onEvent(notificationService, socket, payload))
    })

    socket.on('disconnecting', async () => {
      // broadcast of leaving a story
      await bluebird.map(notificationService.getStoryIdsWhichSocketIn(socket), async (sid) => {
        return onEvent(notificationService, socket, {
          type: OnEventType.USER_LEAVE_STORY,
          value: { storyId: sid },
        })
      })
    })

    socket.on('disconnect', async () => {
      // sync activity
      activityService
        .syncWorkspaceActivities(wid)
        .then(() => console.log(`sync <${workspaceId}> activities successfully`))
        .catch((err) => console.error(err))
      // delete socketId in db
      await notificationService.cleanSocketId(socket.id)
      // broadcast of disconnecting
      await notificationService.broadcastToWorkspace(wid, BroadCastEvent.USER_DISCONNECTED, {
        operatorId: oid,
        sessionId,
      })
    })
  })
}

async function onEvent(service: NotificationService, socket: Socket, req: OnEventRequest) {
  switch (req.type) {
    case OnEventType.USER_ENTER_STORY:
      return onUserEnterOrLeaveStory(
        service.enterStory.bind(service),
        service,
        socket,
        req.value.storyId,
      )
    case OnEventType.USER_LEAVE_STORY:
      return onUserEnterOrLeaveStory(
        service.leaveStory.bind(service),
        service,
        socket,
        req.value.storyId,
      )
  }
}

/**
 * broadcast events between clients
 */
async function broadcast(service: NotificationService, workspaceId: string, req: BroadCastRequest) {
  switch (req.event) {
    // TODO: Fine-grained event broadcast, Revet The following comment code
    // case (BroadCastEvent.ACTIVE_USERS_IN_STORY, BroadCastEvent.MOVE_MOUSE_IN_STORY):
    case BroadCastEvent.ACTIVE_USERS_IN_STORY:
      return service.broadcastToStory(req.event, req.args)
    default:
      return service.broadcastToWorkspace(workspaceId, req.event, req.args)
  }
}

async function onUserEnterOrLeaveStory(
  enterOrLeave: (socket: Socket, storyId: string) => Promise<void>,
  service: NotificationService,
  socket: Socket,
  storyId: string,
) {
  return enterOrLeave(socket, storyId).then(async () => {
    // 1. get online users in story
    const userIds = await service.getActiveUserIdsInStory(storyId)
    // 2. broadcast to clients
    return service.broadcastToStory(BroadCastEvent.ACTIVE_USERS_IN_STORY, {
      userIds,
      storyId,
    })
  })
}

/**
 * must be called after init
 */
export function getNotificationService() {
  return notificationService
}
