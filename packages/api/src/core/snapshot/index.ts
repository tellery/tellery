import _ from 'lodash'
import { SnapshotEntity } from '../../entities/snapshot'
import { SqlQueryResult } from '../../types/connector'
import { SnapshotDTO } from '../../types/snapshot'
import { setByPath } from '../../utils/updater'
import { Entity } from '../common'

export class Snapshot extends Entity {
  id: string

  questionId: string

  sql: string

  data: SqlQueryResult

  constructor(
    id: string,
    questionId: string,
    sql: string,
    data: SqlQueryResult,
    alive: boolean,
    version: number,
    createdById?: string,
    lastEditedById?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(alive, version, createdById, lastEditedById, createdAt, updatedAt)
    if (!id || !questionId || !sql) {
      throw new Error('must set id and questionId and sql')
    }
    this.id = id
    this.questionId = questionId
    this.sql = sql
    this.data = data
  }

  toModel(): SnapshotEntity {
    const entity = new SnapshotEntity()
    entity.id = this.id
    entity.questionId = this.questionId
    entity.sql = this.sql
    entity.data = this.data
    entity.alive = this.alive
    entity.createdById = this.createdById
    entity.lastEditedById = this.lastEditedById
    return entity
  }

  static fromEntity(snapshot: SnapshotEntity) {
    return new Snapshot(
      snapshot.id,
      snapshot.questionId,
      snapshot.sql,
      snapshot.data,
      snapshot.alive,
      snapshot.version,
      snapshot.createdById,
      snapshot.lastEditedById,
      snapshot.createdAt,
      snapshot.updatedAt,
    )
  }

  toDTO(): SnapshotDTO {
    return {
      id: this.id,
      questionId: this.questionId,
      sql: this.sql,
      data: this.data,
      alive: this.alive,
      version: this.version,
      createdById: this.createdById,
      lastEditedById: this.lastEditedById,
      createdAt: this.createdAt?.getTime() || 0,
      updatedAt: this.updatedAt?.getTime() || 0,
    }
  }

  static fromArgs(args: any) {
    return new Snapshot(
      _.get(args, 'id'),
      _.get(args, 'questionId'),
      _.get(args, 'sql'),
      _.get(args, 'data'),
      _.get(args, 'alive'),
      _.get(args, 'version'),
      _.get(args, 'createdById'),
      _.get(args, 'lastEditedById'),
    )
  }

  /**
   * set the value in the content by path, e.g. path = ["a", "b", "c"] => this.content.set("a.b.c", args)
   */
  setContentByPath(path: string[], args: any): void {
    setByPath(this, path, args, (a) => {
      const newSnap = Snapshot.fromArgs(a)
      Object.assign(this, newSnap)
    })
  }
}
