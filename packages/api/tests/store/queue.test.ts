import test, { ExecutionContext } from 'ava'
import config from 'config'
import { nanoid } from 'nanoid'
import { createDatabaseCon } from '../../src/clients/db/orm'

import { getRedisCon } from '../../src/clients/db/redis'
import { PgQueue, Queue, RedisQueue } from '../../src/store/queue'

test.before(async () => {
  await createDatabaseCon()
})

test('test pg queue', async (t) => {
  const mq = new PgQueue<string>()
  await queueHelper(t, mq)
})

test('test redis queue', async (t) => {
  if (!config.has('redis.url')) {
    console.log('There is no redis configured, skipped!')
    return
  }
  const rq = new RedisQueue<string>(getRedisCon())
  await queueHelper(t, rq)
})

async function queueHelper(t: ExecutionContext<unknown>, q: Queue<string>) {
  const key = nanoid()
  // pushed
  await q.addAll(key, ['key1', 'key2'])
  await q.addAll(key, ['key3', 'key4'])
  let data: any

  // pollall
  await q.pollAll(key, async (d) => {
    data = d
  })
  t.deepEqual(data, ['key1', 'key2', 'key3', 'key4'])

  // poll again, empty list are desired
  await q.pollAll(key, async (d) => {
    data = d
  })
  t.deepEqual(data, [])

  // insert when deleting
  await q.pollAll(key, async (d) => {
    data = d
    await q.addAll(key, ['newKey'])
  })
  t.deepEqual(data, [])
  await q.pollAll(key, async (d) => {
    data = d
  })
  // inserted key should be obtained
  t.deepEqual(data, ['newKey'])
}
