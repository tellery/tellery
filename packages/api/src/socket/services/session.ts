import _ from 'lodash'
import { Socket } from 'socket.io'
import { getCacheManager } from '../../utils/cache'
import { Emitter } from '../types'

export interface ISessionService {
  enter(id: string, socket: Socket): Promise<void>

  leave(id: string, socket: Socket): Promise<void>

  emit(id: string, event: string, val: any): Promise<boolean>

  /**
   * get the list of online socket
   * @return socket id list
   */
  getOnlineList(id: string): Promise<string[]>
}

export class StorySessionService implements ISessionService {
  private readonly emitter: Emitter

  private readonly onlineTTL = 3600

  constructor(emitter: Emitter) {
    this.emitter = emitter
  }

  get cache() {
    return getCacheManager(false)
  }

  async enter(storyId: string, socket: Socket): Promise<void> {
    await this.updateOnlineCache(storyId, (val) =>
      _([val, socket.id]).flatMap().compact().uniq().value(),
    )
    socket.join(this.getRoomKey(storyId))?.catch((err) => console.error(err))
  }

  async leave(storyId: string, socket: Socket): Promise<void> {
    await this.updateOnlineCache(storyId, (val) =>
      _(val)
        .filter((v) => v !== socket.id)
        .value(),
    )

    socket.leave(this.getRoomKey(storyId))?.catch((err) => console.error(err))
  }

  async emit(storyId: string, event: string, val: unknown): Promise<boolean> {
    return this.emitter.to(this.getRoomKey(storyId)).emit(event, val)
  }

  async getOnlineList(storyId: string): Promise<string[]> {
    const key = this.getOnlineKey(storyId)
    const onlineList = (await this.cache.get(key)) as string[] | undefined
    return onlineList || []
  }

  private async updateOnlineCache(
    storyId: string,
    valueUpdater: (val: string[] | undefined) => string[],
  ) {
    const key = this.getOnlineKey(storyId)
    const onlineList = (await this.cache.get(key)) as string[] | undefined
    const newVal = valueUpdater(onlineList)
    return this.cache.set(key, newVal, this.onlineTTL)
  }

  private getRoomKey(id: string) {
    return `st-${id}`
  }

  private getOnlineKey(id: string) {
    return `online-${id}`
  }
}

export class WorkspaceSessionService implements ISessionService {
  private readonly emitter: Emitter

  constructor(emitter: Emitter) {
    this.emitter = emitter
  }

  async enter(workspaceId: string, socket: Socket): Promise<void> {
    socket.join(this.getRoomKey(workspaceId))?.catch((err) => console.error(err))
  }

  async leave(workspaceId: string, socket: Socket): Promise<void> {
    socket.leave(this.getRoomKey(workspaceId))?.catch((err) => console.error(err))
  }

  async emit(workspaceId: string, event: string, val: unknown): Promise<boolean> {
    return this.emitter.to(this.getRoomKey(workspaceId)).emit(event, val)
  }

  getOnlineList(): Promise<string[]> {
    throw new Error('Method not implemented.')
  }

  private getRoomKey(workspaceId: string): string {
    // wn => workspace notification
    return `wn-${workspaceId}`
  }
}
