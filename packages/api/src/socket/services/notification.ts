import _ from 'lodash'
import bluebird from 'bluebird'
import { Namespace, Socket } from 'socket.io'

import { NotificationOpt } from '../../clients/socket/interface'
import { BroadCastArgs, BroadCastEvent, BroadCastValue } from '../../types/socket'
import { getCacheManager } from '../../utils/cache'
import { ISessionService, StorySessionService, WorkspaceSessionService } from './session'
import { Emitter } from '../types'

enum SocketEvent {
  NOTIFICATION = 'notification',
}

/**
 * notify frontend by socketio emitter
 */
export class NotificationService {
  nio: Namespace

  private workspaceSession: ISessionService

  private storySession: ISessionService

  constructor(nio: Namespace, e: Emitter) {
    this.workspaceSession = new WorkspaceSessionService(e)
    this.storySession = new StorySessionService(e)
    this.nio = nio
  }

  get cache() {
    return getCacheManager(false)
  }

  getStoryIdsWhichSocketIn(socket: Socket): string[] {
    const prefix = 'st-'

    const res = new Set<string>()
    socket.rooms?.forEach((k) => {
      if (_.startsWith(k, prefix)) {
        res.add(_.trimStart(k, prefix))
      }
    })
    return Array.from(res.values())
  }

  async storeUserIdAndSocketId(socketId: string, operatorId: string): Promise<void> {
    await this.cache.set(this.getUserSocketIdCachedKey(socketId), operatorId, 1800)
  }

  getUserIdBySocketId(socketId: string): Promise<string | undefined> {
    return this.cache.get(this.getUserSocketIdCachedKey(socketId))
  }

  cleanSocketId(socketId: string) {
    return this.cache.del(this.getUserSocketIdCachedKey(socketId))
  }

  enterWorkspace(socket: Socket, workspaceId: string): Promise<void> {
    return this.workspaceSession.enter(workspaceId, socket)
  }

  enterStory(socket: Socket, storyId: string): Promise<void> {
    return this.storySession.enter(storyId, socket)
  }

  leaveWorkspace(socket: Socket, workspaceId: string): Promise<void> {
    return this.workspaceSession.leave(workspaceId, socket)
  }

  leaveStory(socket: Socket, storyId: string): Promise<void> {
    return this.storySession.leave(storyId, socket)
  }

  /**
   * get users stayed in a certain story
   * @return user id list
   */
  async getActiveUserIdsInStory(storyId: string): Promise<string[]> {
    const socketIds = await this.storySession.getOnlineList(storyId)

    const userIds = await bluebird.map(socketIds, async (sid) => this.getUserIdBySocketId(sid), {
      concurrency: 5,
    })
    return _(userIds).compact().uniq().value()
  }

  async sendUpdateEntityEvent(
    workspaceId: string,
    operatorId: string,
    opts: NotificationOpt[],
  ): Promise<void> {
    await this.workspaceSession.emit(
      workspaceId,
      SocketEvent.NOTIFICATION,
      this.updateEntityOptsWrapper(workspaceId, operatorId, opts),
    )
    // TODO: Fine-grained event broadcast, Revet The following comment code
    // // modification in story
    // const optsInStory = _(opts)
    //   .filter((o) => this.isInsideStoryOpt(o))
    //   .map((o) => ({
    //     ...o,
    //     storyId: o.storyId || o.id,
    //   }))
    //   .value()
    // // modification in workspace
    // const optsOutsideStory = _(opts)
    //   .filter((o) => !this.isInsideStoryOpt(o))
    //   .value()

    // if (!_.isEmpty(optsOutsideStory)) {
    //   await this.workspaceSession.emit(
    //     workspaceId,
    //     SocketEvent.NOTIFICATION,
    //     this.updateEntityOptsWrapper(workspaceId, operatorId, optsOutsideStory),
    //   )
    // }

    // if (!_.isEmpty(optsInStory)) {
    //   await this.emitOptsToStory(workspaceId, operatorId, optsInStory)
    // }
  }

  /**
   * broadcast to users staying in a certain story
   */
  async broadcastToStory(event: BroadCastEvent, args: BroadCastArgs): Promise<boolean> {
    const storyId = this.getStoryIdFromBroadCastArgs(args)!

    return this.storySession.emit(
      storyId,
      SocketEvent.NOTIFICATION,
      this.makeBroadcastValue(event, args),
    )
  }

  /**
   * broadcast to all live users of the workspace
   */
  async broadcastToWorkspace(
    workspaceId: string,
    event: BroadCastEvent,
    args: BroadCastArgs,
  ): Promise<boolean> {
    return this.workspaceSession.emit(
      workspaceId,
      SocketEvent.NOTIFICATION,
      this.makeBroadcastValue(event, args),
    )
  }

  private updateEntityOptsWrapper = (
    workspaceId: string,
    operatorId: string,
    nos: NotificationOpt[],
  ) => ({
    type: 'updateEntity',
    value: _(nos)
      .map((o) => ({ workspaceId, operatorId, ...o }))
      .uniqBy('id')
      .value(),
  })

  private makeBroadcastValue(
    event: BroadCastEvent,
    args: BroadCastArgs,
  ): { type: 'broadcast'; value: BroadCastValue } {
    return { type: 'broadcast', value: { event, args } }
  }

  private getStoryIdFromBroadCastArgs(args: BroadCastArgs): string | undefined {
    return (args as { storyId: string }).storyId
  }

  private getUserSocketIdCachedKey(socketId: string): string {
    return `user-socket-${socketId}`
  }
}
