import _ from 'lodash'
import { BlockDTO } from '../../types/block'
import { EntityType } from '../../types/entity'
import { SnapshotDTO } from '../../types/snapshot'
import { StoryDTO } from '../../types/story'
import { Recordable } from '../activity'

export class Common {
  version: number

  updatedAt?: Date

  createdAt?: Date

  constructor(version: number, createdAt?: Date, updatedAt?: Date) {
    this.version = version
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }
}

export class Entity extends Common implements Recordable<Entity> {
  alive: boolean

  createdById?: string

  lastEditedById?: string

  constructor(
    alive: boolean,
    version: number,
    createdById?: string,
    lastEditedById?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(version, createdAt, updatedAt)
    this.createdById = createdById
    this.lastEditedById = lastEditedById
    this.alive = alive
    this.version = version
  }

  getEntityType(): EntityType {
    throw new Error('Method not implemented.')
  }

  toDTO(): BlockDTO | StoryDTO | SnapshotDTO {
    throw new Error('Method not implemented')
  }

  getPlainText(): string | undefined {
    return undefined
  }

  /**
   * this denotes the fields where the modification of themselves should be recorded into buffer
   */
  getRecordedKeys(): string[] {
    return []
  }

  /**
   * comparing to new entity, to check if this modification should be recorded
   * @param newEntity
   */
  needRecord(ne: Entity): boolean {
    let need = false
    _(this.getRecordedKeys()).forEach((k) => {
      if (!_.isEqual(_(this).get(k), _(ne).get(k))) {
        need = true
      }
    })
    return need
  }
}
