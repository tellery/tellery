import _ from 'lodash'

import { Snapshot } from '.'
import { SnapshotEntity } from '../../entities/snapshot'
import { canGetWorkspaceData } from '../../utils/permission'
import { DefaultOperation } from '../operation/operation'
import { IPermission } from '../permission'

export class SnapshotOperation extends DefaultOperation {
  async entity(id: string): Promise<Snapshot> {
    const model = await this.manager.getRepository(SnapshotEntity).findOne(id)
    if (!model) {
      return { id } as Snapshot
    }
    return Snapshot.fromEntity(model)
  }

  async set(snapshot: Snapshot, args: any, path: string[]): Promise<Snapshot> {
    if (_(path).isEmpty()) {
      return Snapshot.fromArgs(args)
    }

    snapshot.setContentByPath(path, args)
    return snapshot
  }

  async update(snapshot: Snapshot, args: any, path: string[]): Promise<Snapshot> {
    if (this.isObjOrMap(args)) {
      _.forEach(args, (val, key) => snapshot.setContentByPath([...path, key], val))
    } else {
      snapshot.setContentByPath(path, args)
    }

    return snapshot
  }

  async save(entity: Snapshot): Promise<void> {
    await this.manager.getRepository(SnapshotEntity).save(entity.toModel())
  }

  checkPermission(ipv: IPermission): Promise<void> {
    return canGetWorkspaceData(ipv, this.operator, this.workspaceId)
  }
}
