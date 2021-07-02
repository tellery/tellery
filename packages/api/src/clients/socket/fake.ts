import { SocketManager } from './interface'

export class FakeSocketManager implements SocketManager {
  async sendEntitiesChangedNotification(): Promise<void> {
    console.log('invoke fake socket manager')
  }
}
