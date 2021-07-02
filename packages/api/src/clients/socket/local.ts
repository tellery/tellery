import { NotificationService } from '../../socket/services/notification'
import { NotificationOpt, SocketManager } from './interface'

/**
 * interacting with local socket server
 */
export class LocalSocketManager implements SocketManager {
  notificationService: NotificationService

  constructor(ns: NotificationService) {
    this.notificationService = ns
  }

  sendEntitiesChangedNotification(
    workspaceId: string,
    operatorId: string,
    opts: NotificationOpt[],
  ): Promise<void> {
    return this.notificationService.sendUpdateEntityEvent(workspaceId, operatorId, opts)
  }
}
