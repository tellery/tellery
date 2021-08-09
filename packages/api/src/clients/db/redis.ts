import IORedis from 'ioredis'
import config from 'config'

let client: IORedis.Redis

function createRedisCon(redisUrl: string) {
  client = new IORedis(redisUrl, { keyPrefix: 'tellery:' })

  client.on('error', (error: unknown) => {
    console.error(`Redis ${redisUrl} connection error`, error)
    // broke down
    throw error
  })

  return client
}

export function getRedisCon(): typeof client {
  if (client) {
    return client
  }
  if (!config.has('redis.url')) {
    throw new Error('redis url is missing')
  }

  return createRedisCon(config.get('redis.url'))
}
