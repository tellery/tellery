import { OperationCmdType } from '../../types/operation'
import { IOperationEntity, Operation } from './operation'

/**
 * update values of a block or its property
 * usually used for update the created time, modified time, version, layout, etc. of a block.
 */
export class UpdateOperation extends Operation {
  static cmd = OperationCmdType.UPDATE

  apply(entity: IOperationEntity): Promise<IOperationEntity> {
    return this.operation.update(entity, this.args, this.path)
  }
}
