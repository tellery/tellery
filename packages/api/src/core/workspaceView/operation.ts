import _ from 'lodash'
import assert from 'assert'
import { DefaultOperation } from '../operation/operation'
import { removeByPathAndId } from '../../utils/updater'
import { canGetWorkspaceData } from '../../utils/permission'
import { IPermission } from '../permission'
import { WorkspaceViewEntity } from '../../entities/workspaceView'
import { WorkspaceView } from '.'

// check ../story/operation.ts
export class WorkspaceViewOperation extends DefaultOperation {
  async entity(id: string): Promise<WorkspaceView> {
    const model = await this.manager.getRepository(WorkspaceViewEntity).findOneOrFail(id)
    return WorkspaceView.fromEntity(model)
  }

  async remove(entity: WorkspaceView, operateeId: string, path: string[]): Promise<WorkspaceView> {
    this.validatePath(path)
    removeByPathAndId(entity, path, operateeId)
    return entity
  }

  async updateIndex(
    entity: WorkspaceView,
    operateeId: string,
    path: string[],
    flag: 'before' | 'after',
    targetId?: string,
  ) {
    this.validatePath(path)

    return this.updateIndexHelper(entity, operateeId, path, flag, targetId)
  }

  async save(entity: WorkspaceView): Promise<void> {
    await this.manager.getRepository(WorkspaceViewEntity).save(entity.toModel())
  }

  checkPermission(ipv: IPermission): Promise<void> {
    return canGetWorkspaceData(ipv, this.operator, this.workspaceId)
  }

  private validatePath(path: string[]) {
    assert(path.length !== 0, 'the path of updating is invalid')
    assert(_.isEqual(path, ['pinnedList']), 'the path of updating is invalid')
  }
}
