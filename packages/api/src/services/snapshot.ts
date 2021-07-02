import _ from 'lodash'
import { getRepository, In } from 'typeorm'

import { getIPermission, IPermission } from '../core/permission'
import { Snapshot } from '../core/snapshot'
import { SnapshotEntity } from '../entities/snapshot'
import { SnapshotDTO } from '../types/snapshot'
import { canGetWorkspaceData } from '../utils/permission'

export class SnapshotService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  async mget(
    operatorId: string,
    workspaceId: string,
    snapshotIds: string[],
  ): Promise<SnapshotDTO[]> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    const mgetList = await this.mgetByIds(snapshotIds)

    return _(mgetList)
      .map((l) => l.toDTO())
      .value()
  }

  private async mgetByIds(snapshotIds: string[]): Promise<Snapshot[]> {
    const models = await getRepository(SnapshotEntity).find({ id: In(snapshotIds), alive: true })
    return _(models)
      .map((m) => Snapshot.fromEntity(m))
      .value()
  }
}

const service = new SnapshotService(getIPermission())
export default service
