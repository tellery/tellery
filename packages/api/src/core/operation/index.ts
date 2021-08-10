import { cloneDeep, keyBy } from 'lodash'
import { EntityManager } from 'typeorm'

import { InvalidArgumentError } from '../../error/error'
import { ActivitySyncService } from '../../services/activitySync'
import historyService from '../../services/history'
import { BlockType } from '../../types/block'
import { OperationCmdType, OperationTableType } from '../../types/operation'
import { Block } from '../block'
import { BlockOperation } from '../block/operation'
import { IPermission } from '../permission'
import { SnapshotOperation } from '../snapshot/operation'
import { WorkspaceViewOperation } from '../workspaceView/operation'
import { ListAfterOperation } from './listAfter'
import { ListBeforeOperation } from './listBefore'
import { ListRemoveOperation } from './listRemove'
import { IOperation, IOperationEntity, OperationConstructor } from './operation'
import { SetOperation } from './set'
import { SetPermissionsOperation } from './setPermissions'
import { UpdateOperation } from './update'

export class OperationManager {
  // operand id
  id: string

  // where operand in
  workspaceId: string

  operator: string

  permission: IPermission

  operation: IOperation

  table: OperationTableType

  // be null until `begin()` got called
  // mutable value, will be modified
  entity!: IOperationEntity

  // be null until `begin()` got called
  // the value of `operation.find()` in the very beginning
  private _origin?: IOperationEntity

  activitySyncService: ActivitySyncService

  constructor(
    id: string,
    workspaceId: string,
    operator: string,
    table: OperationTableType,
    manager: EntityManager,
    permission: IPermission,
    activityService: ActivitySyncService,
  ) {
    this.id = id
    this.workspaceId = workspaceId
    this.operator = operator
    this.table = table
    this.operation = getIOperation(operator, workspaceId, manager, table)
    this.permission = permission
    this.activitySyncService = activityService
  }

  async begin(): Promise<void> {
    const [entity, origin] = await Promise.all([
      this.operation.entity(this.id),
      this.operation.findInDB(this.id),
    ])
    this.entity = entity
    this._origin = origin
  }

  async next(cmd: OperationCmdType, path: string[], args: any): Promise<void> {
    const op = new (getOperationConstructor(cmd))(this.id, path, args, this.operation)
    this.entity = await op.apply(cloneDeep(this.entity))
  }

  async end(): Promise<void> {
    await this.operation.checkPermission(this.permission, this.entity, this._origin)
    await this.operation.save(this.entity, this._origin)
    // record the operation
    const before = this._origin
    const after = await this.operation.findInDB(this.id)
    this.recordActivity(before, after).catch((err) => console.error(err))
    this.saveStorySnapshot(after).catch((err) => console.error(err))
  }

  /**
   * record operation into buffer
   * @param cmd
   * @param path
   * @param args
   */
  async recordActivity(before?: IOperationEntity, after?: IOperationEntity): Promise<void> {
    // the condition of being saved into buffer:
    // the entity does not exists before or the crucial fields got modified
    // FIXME: after type
    if (before !== undefined && !before.needRecord(after as any)) {
      return
    }
    return this.activitySyncService.sendToBuffer(this.workspaceId, [
      this.activitySyncService.makeActivityPayload(
        this.id,
        this.workspaceId,
        this.operator,
        this.table,
        // `after` must exist
        after!,
        before,
      ),
    ])
  }

  async saveStorySnapshot(after?: IOperationEntity) {
    if (this.table !== OperationTableType.BLOCK || !after) {
      return
    }

    const block = after as Block

    if (
      block.getType() !== BlockType.STORY ||
      block.version % 50 !== 0 ||
      !block.lastEditedById ||
      !block.alive
    ) {
      return
    }

    return historyService.dumpAndSaveStory(block.lastEditedById, block.workspaceId!, block.storyId)
  }
}

/**
 * get the corresponding IOperation by the type of table
 */
export function getIOperation(
  operatorId: string,
  workspaceId: string,
  manager: EntityManager,
  table: OperationTableType,
): IOperation {
  switch (table) {
    case OperationTableType.BLOCK:
      return new BlockOperation(operatorId, workspaceId, manager)
    case OperationTableType.WORKSPACE_VIEW:
      return new WorkspaceViewOperation(operatorId, workspaceId, manager)
    case OperationTableType.SNAPSHOT:
      return new SnapshotOperation(operatorId, workspaceId, manager)
    default:
      throw InvalidArgumentError.new('Unknown operation table')
  }
}

const cmdToOperationConstructorMap = keyBy(
  [
    SetOperation,
    UpdateOperation,
    ListBeforeOperation,
    ListAfterOperation,
    ListRemoveOperation,
    SetPermissionsOperation,
  ],
  'cmd',
)

/**
 * get the corresponding init function by the type of Operation
 */
export function getOperationConstructor(cmd: OperationCmdType): OperationConstructor {
  return cmdToOperationConstructorMap[cmd]
}
