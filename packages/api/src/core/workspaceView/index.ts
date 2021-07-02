import _ from 'lodash'
import { WorkspaceViewEntity } from '../../entities/workspaceView'

import { WorkspaceViewDTO } from '../../types/workspaceView'
import { removeByPathAndId } from '../../utils/updater'
import { Recordable } from '../activity'
import { Common } from '../common'

export class WorkspaceView extends Common implements Recordable<WorkspaceView> {
  id: string

  workspaceId: string

  userId: string

  // story id list
  pinnedList: string[]

  constructor(
    id: string,
    workspaceId: string,
    userId: string,
    pinnedList: string[],
    version: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(version, createdAt, updatedAt)
    this.id = id
    this.workspaceId = workspaceId
    this.userId = userId
    this.pinnedList = pinnedList
  }

  needRecord(): boolean {
    return false
  }

  toModel(): WorkspaceViewEntity {
    const entity = new WorkspaceViewEntity()
    entity.id = this.id
    entity.workspaceId = this.workspaceId
    entity.userId = this.userId
    entity.pinnedList = this.pinnedList
    return entity
  }

  toDTO(): WorkspaceViewDTO {
    return {
      id: this.id,
      pinnedList: this.pinnedList,
      version: this.version,
    }
  }

  static fromEntity(model: WorkspaceViewEntity): WorkspaceView {
    return new WorkspaceView(
      model.id,
      model.workspaceId,
      model.userId,
      model.pinnedList,
      model.version,
      model.createdAt,
      model.updatedAt,
    )
  }

  static fromArgs(args: any) {
    return new WorkspaceView(
      _.get(args, 'id'),
      _.get(args, 'workspaceId'),
      _.get(args, 'userId'),
      _.get(args, 'pinnedList'),
      _.get(args, 'version'),
    )
  }

  /**
   * delete elements in content that possessed the same id (by path)
   * NOTE: this.content.get(path) must be array or map, and its elements must have the field of `id`.
   */
  removeContentByPathAndId(path: string[], id: string): void {
    removeByPathAndId(this, path, id)
  }
}
