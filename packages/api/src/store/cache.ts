import cacheManager, { Cache } from 'cache-manager'
import { Redis } from 'ioredis'

const redisStore = require('cache-manager-ioredis')

export interface CacheStore {
  get(): Cache
}

const defaultTTL = 3600

export class MemoryCache implements CacheStore {
  cache: Cache

  constructor(ttl?: number) {
    this.cache = cacheManager.caching({ store: 'memory', max: 500, ttl: ttl || defaultTTL })
  }

  get(): Cache {
    return this.cache
  }
}

export class RedisCache implements CacheStore {
  cache: Cache

  constructor(client: Redis, ttl?: number) {
    this.cache = cacheManager.caching({
      store: redisStore,
      redisInstance: client,
      ttl: ttl || defaultTTL,
    })
  }

  get(): Cache {
    return this.cache
  }
}
