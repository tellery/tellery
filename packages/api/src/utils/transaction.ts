import { EntityManager, QueryFailedError } from 'typeorm'
import Bluebird from 'bluebird'

export async function withSerializableTransaction<T>(
  m: EntityManager,
  runInTransaction: (m: EntityManager) => Promise<T>,
  retryCount = 3,
): Promise<T> {
  return m.transaction('SERIALIZABLE', runInTransaction).catch(async (err) => {
    if (err instanceof QueryFailedError && err.driverError.code === '40001' && retryCount > 0) {
      await Bluebird.delay(5)
      return withSerializableTransaction(m, runInTransaction, retryCount - 1)
    } else {
      throw err
    }
  })
}
