import { get } from 'lodash'
import { OperationCmdType } from '../../types/operation'
import { IOperationEntity, Operation } from './operation'

/**
 * insert a record into an array property, exactly AFTER a certain element
 * usually used for the inserting part of dragging, which consists of first removing then inserting.
 */
export class ListAfterOperation extends Operation {
  static cmd = OperationCmdType.LIST_AFTER

  private static flag: 'after' = 'after'

  private static targetIdFlag = 'id'

  apply(entity: IOperationEntity): Promise<IOperationEntity> {
    const afterId = get(this.args, ListAfterOperation.flag)
    const operatorId = get(this.args, ListAfterOperation.targetIdFlag)
    console.log(`move ${operatorId} behind of ${[entity.id, ...this.path, afterId].join('.')}`)

    return this.operation.updateIndex(
      entity,
      operatorId,
      this.path,
      ListAfterOperation.flag,
      afterId,
    )
  }
}
