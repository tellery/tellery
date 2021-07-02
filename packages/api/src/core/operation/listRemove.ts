import { get } from 'lodash'
import { OperationCmdType } from '../../types/operation'
import { IOperationEntity, Operation } from './operation'

/**
 * remove a record from an array property.
 * usually used for removing a block from its parent
 * also used for the removing part of dragging, which consists of first removing then dragging
 */
export class ListRemoveOperation extends Operation {
  static cmd = OperationCmdType.LIST_REMOVE

  private static operateeIdFlag = 'id'

  apply(entity: IOperationEntity): Promise<IOperationEntity> {
    return this.operation.remove(
      entity,
      get(this.args, ListRemoveOperation.operateeIdFlag),
      this.path,
    )
  }
}
