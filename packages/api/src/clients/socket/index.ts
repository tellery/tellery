import { NotificationService } from '../../socket/services/notification'
import { HttpSocketManager } from './httpManager'
import { SocketManager } from './interface'
import { LocalSocketManager } from './local'

export function getSocketManager(opt: string | NotificationService): SocketManager {
  if (typeof opt === 'string') {
    return new HttpSocketManager(opt)
  }
  return new LocalSocketManager(opt)
}
