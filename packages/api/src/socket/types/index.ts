import { Emitter as PGEmitter } from '@socket.io/postgres-emitter'
import { Emitter as RedisEmitter } from '@socket.io/redis-emitter'

export type Emitter = PGEmitter | RedisEmitter
