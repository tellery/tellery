export interface SocketManager {
  sendEntitiesChangedNotification(
    workspaceId: string,
    operatorId: string,
    opts: NotificationOpt[],
  ): Promise<void>
}

export type NotificationPayload = {
  workspaceId: string
  operatorId: string
  opts: NotificationOpt[]
}

export type NotificationOpt = {
  id: string
  storyId?: string // nonnull if type is block
  type: 'block' | 'workspaceView'
}
