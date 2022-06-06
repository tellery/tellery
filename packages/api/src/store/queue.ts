import { Redis } from 'ioredis'
import _ from 'lodash'
import { Connection, EntityManager, getConnection } from 'typeorm'

import { QueueEntity } from '../entities/queue'

export interface Queue<T> {
  addAll(key: string, elements: T[]): Promise<void>

  /**
   * @param cb: callbacks of handling polled elements
   */
  pollAll(key: string, cb?: (elements: T[]) => Promise<void>): Promise<void>
}

export class PgQueue<T> implements Queue<T> {
  private readonly limit = 100

  connection!: Connection

  async addAll(key: string, elements: T[]): Promise<void> {
    const models = _(elements)
      .map((ele) => ({ key, object: ele }))
      .value()
    await this.getConnection().getRepository(QueueEntity).insert(models)
  }

  async pollAll(
    key: string,
    cb?: (elements: T[], session: EntityManager) => Promise<void>,
  ): Promise<void> {
    await this.getConnection().transaction(async (manager) => {
      const models = await manager.getRepository(QueueEntity).find({
        where: { key, deleted: false },
        order: { id: 'ASC' },
        take: this.limit,
      })
      const ids = _(models).map('id').value()

      if (!_.isEmpty(ids)) {
        await manager.getRepository(QueueEntity).delete(ids)
      }
      const elements = _(models).map('object').value()
      if (cb) {
        await cb(elements as T[], manager)
      }
    })
  }

  private getConnection() {
    if (!this.connection) {
      this.connection = getConnection()
    }
    return this.connection
  }
}

export class RedisQueue<T> implements Queue<T> {
  client: Redis

  private readonly limit = 100

  constructor(client: Redis) {
    this.client = client
  }

  async addAll(key: string, elements: T[]): Promise<void> {
    await this.client.rpush(
      key,
      ..._(elements)
        .map((ele) => JSON.stringify(ele))
        .value(),
    )
  }

  async pollAll(key: string, cb?: (elements: T[]) => Promise<void>): Promise<void> {
    await this.client
      .pipeline()
      .lrange(key, 0, this.limit, async (err, data) => {
        if (err) {
          throw err
        }
        if (cb) {
          await cb(
            _(data)
              .map((d) => JSON.parse(d))
              .value(),
          )
        }
      })
      .ltrim(key, this.limit + 1, -1)
      .exec()
  }
}
