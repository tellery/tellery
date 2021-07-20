import { createAdapter as createPostgresAdapter } from '@socket.io/postgres-adapter'
import config from 'config'
import { Server } from 'http'
import { Pool } from 'pg'
import { Server as SocketIO } from 'socket.io'
import { createAdapter as createRedisAdapter } from 'socket.io-redis'

import { initDatabaseConRetry, PostgreSQLConfig } from '../clients/db/orm'
import { getRedisCon } from '../clients/db/redis'
import validate from './middlewares/validate'
import { init } from './routers/story'

export function initSocketServer(s: Server): SocketIO {
  initDatabaseConRetry(99)

  const io = new SocketIO(s, {
    // heartbeat each 10s
    pingInterval: 10000,
    // disconnected after 60s timeout of heartbeat
    pingTimeout: 60000,
    transports: ['websocket'],
  })

  // if redis is configured, use it as the emitter of socketio, else pg
  if (config.has('redis.url')) {
    const pubClient = getRedisCon()
    const subClient = pubClient.duplicate()
    io.adapter(createRedisAdapter({ pubClient, subClient }))
  } else {
    const {
      username: user,
      host,
      database,
      port,
      password,
    } = config.get<PostgreSQLConfig>('postgres')

    const pool = new Pool({
      user,
      host,
      database,
      password,
      port,
    })
    io.adapter(createPostgresAdapter(pool))
  }

  io.use(validate)

  init(io)

  return io
}
