import { OperationCmdType } from '../../types/operation'
import { IOperationEntity, Operation } from './operation'

/**
 * change the permission of an element
 * for instance of story, if the permission of a story changed, all of the permission of blocks in it will be changed
 */
export class SetPermissionsOperation extends Operation {
  static cmd = OperationCmdType.SET_PERMISSIONS

  apply(entity: IOperationEntity): Promise<IOperationEntity> {
    return this.operation.setPermissions(entity, this.args, this.path)
  }
}
