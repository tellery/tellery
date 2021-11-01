import bluebird from 'bluebird'
import _ from 'lodash'
import { getManager } from 'typeorm'
import config from 'config'

import { NotificationOpt, SocketManager } from '../clients/socket/interface'
import { OperationManager } from '../core/operation'
import { IPermission } from '../core/permission'
import { OperationTableType, SingleOperation } from '../types/operation'
import activityService, { ActivitySyncService } from './activitySync'
import { getSocketManager } from '../clients/socket'
import { getIPermission } from '../core/permission'
import { getNotificationService } from '../socket/routers/story'

export class OperationService {
  private permission: IPermission

  private socketManger: SocketManager

  private activityService: ActivitySyncService

  private readonly notificationTypes = [OperationTableType.BLOCK, OperationTableType.WORKSPACE_VIEW]

  constructor(p: IPermission, sm: SocketManager) {
    this.permission = p
    this.socketManger = sm
    this.activityService = activityService()
  }

  async saveSingleTransaction(
    operatorId: string,
    workspaceId: string,
    data: SingleOperation[],
    opts: { skipPermissionCheck?: boolean } = {},
  ): Promise<void> {
    const { skipPermissionCheck = false } = opts
    return getManager().transaction(async (t) => {
      const cache: { [k: string]: OperationManager } = {}
      await bluebird.each(data, async (val) => {
        const manger =
          cache[val.id] ||
          (await (async () => {
            const m = new OperationManager(
              val.id,
              workspaceId,
              operatorId,
              val.table,
              t,
              !skipPermissionCheck ? this.permission : null,
              this.activityService,
            )
            cache[val.id] = m
            await m.begin()
            return m
          })())

        await manger.next(val.cmd, val.path, val.args)
      })
      await bluebird.map(_(cache).keys().value(), async (k) => cache[k].end())
    })
  }

  /**
   * batch operation execution
   * @param data: transactions gonna be executed
   * @return: failed transactions
   */
  async saveTransactions(
    operatorId: string,
    data: { id: string; workspaceId: string; operations: SingleOperation[] }[],
    opts: { skipPermissionCheck?: boolean } = {},
  ): Promise<{ error: Error; transactionId: string }[]> {
    const res: { error: Error; transactionId: string }[] = []
    const successes: { id: string; workspaceId: string; operations: SingleOperation[] }[] = []

    await bluebird.each(data, async (transaction) => {
      try {
        await this.saveSingleTransaction(
          operatorId,
          transaction.workspaceId,
          transaction.operations,
          opts,
        )
        successes.push(transaction)
      } catch (error: unknown) {
        res.push({
          error: error as Error,
          transactionId: transaction.id,
        })
      }
    })

    // notify client of this update
    this.sendNotification(operatorId, successes).catch((err) => console.error(err))

    return _.compact(res)
  }

  makeNotificationPayload(
    data: { id: string; workspaceId: string; operations: SingleOperation[] }[],
  ): { workspaceId: string; opts: NotificationOpt[] }[] {
    // merge all operations happened to the same storyId of the same workspaceId
    // 1. aggregate by workspaceId
    return _(data)
      .groupBy('workspaceId')
      .map((opts, wid) => {
        const s = _(opts)
          // 2. expand all operations of this workspace, deduplicate and filter
          .map('operations')
          .flatMap()
          .uniqBy('id')
          .filter((o) => this.notificationTypes.includes(o.table))
          .map(
            (o): NotificationOpt => ({
              id: o.id,
              storyId: _(o.args).get('storyId'),
              type: o.table as 'workspaceView' | 'block',
            }),
          )
          .value()
        return {
          workspaceId: wid,
          opts: s,
        }
      })
      .flatMap()
      .value()
  }

  async sendNotification(
    operatorId: string,
    data: { id: string; workspaceId: string; operations: SingleOperation[] }[],
  ): Promise<void[]> {
    const payloads = this.makeNotificationPayload(data)

    return bluebird.map(payloads, async ({ workspaceId, opts }) =>
      this.socketManger.sendEntitiesChangedNotification(workspaceId, operatorId, opts),
    )
  }
}
let operationService: OperationService

export function getOperationService(): OperationService {
  if (operationService) {
    return operationService
  }
  operationService = new OperationService(
    getIPermission(),
    getSocketManager(
      config.has('socket.url') ? config.get('socket.url') : getNotificationService(),
    ),
  )
  return operationService
}
