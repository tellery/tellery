import { get } from 'lodash'
import { OperationCmdType } from '../../types/operation'
import { IOperationEntity, Operation } from './operation'

/**
 * insert a record into an array property, exactly BEFORE a certain element
 * the dragging use listAfter by default, and listBefore used for cases that listAfter cannot express (e.g. put an element to the first pos)
 */
export class ListBeforeOperation extends Operation {
  static cmd = OperationCmdType.LIST_BEFORE

  private static flag: 'before' = 'before'

  private static targetIdFlag = 'id'

  apply(entity: IOperationEntity): Promise<IOperationEntity> {
    const beforeId = get(this.args, ListBeforeOperation.flag)
    const operatorId = get(this.args, ListBeforeOperation.targetIdFlag)
    console.log(`move ${operatorId} in front of ${[entity.id, ...this.path, beforeId].join('.')}`)

    return this.operation.updateIndex(
      entity,
      operatorId,
      this.path,
      ListBeforeOperation.flag,
      beforeId,
    )
  }
}
