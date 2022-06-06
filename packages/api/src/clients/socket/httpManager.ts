import got, { Got } from 'got'
import { beauty, getUpstreamHook } from '../../utils/http'
import { NotificationOpt, SocketManager } from './interface'

/**
 * interacting with websocket server by http
 */
export class HttpSocketManager implements SocketManager {
  private readonly upstream = 'Socket'

  private readonly timeout = 3000

  private got: Got

  constructor(url: string) {
    this.got = got.extend({
      hooks: {
        beforeError: [getUpstreamHook(this.upstream)],
      },
      prefixUrl: url,
      timeout: {
        response: this.timeout,
      },
      responseType: 'json',
    })
  }

  async sendEntitiesChangedNotification(
    workspaceId: string,
    operatorId: string,
    opts: NotificationOpt[],
  ): Promise<void> {
    await beauty(() =>
      this.got.post('api/socket/internals/sendEntitiesChangedNotification', {
        json: {
          workspaceId,
          operatorId,
          entities: opts,
        },
      }),
    )
  }
}
