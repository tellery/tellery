import { OperationCmdType } from '../../types/operation'
import { IOperationEntity, Operation } from './operation'

/**
 * set values of a block or its property. if the block or its property does not exist, it/they will be created.
 * usually used for create block or override properties.
 */
export class SetOperation extends Operation {
  static cmd = OperationCmdType.SET

  apply(entity: IOperationEntity): Promise<IOperationEntity> {
    return this.operation.set(entity, this.args, this.path)
  }
}
