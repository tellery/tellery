import cacheManager from 'cache-manager'
import config from 'config'

import { getRedisCon } from '../clients/db/redis'
import { MemoryCache, RedisCache } from '../store/cache'

const ttl = 3600

let cache: cacheManager.Cache
const memoryCache = new MemoryCache(ttl)

export function getCacheManager(memoryOnly = true): cacheManager.Cache {
  if (memoryOnly) {
    return memoryCache.get()
  }

  if (cache) {
    return cache
  }
  let externalCache: cacheManager.Cache
  if (config.has('redis.url')) {
    const rc = new RedisCache(getRedisCon(), ttl)
    externalCache = rc.get()
  } else {
    externalCache = memoryCache.get()
  }

  cache = externalCache
  return cache
}
