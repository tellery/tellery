import config from 'config'
import bluebird from 'bluebird'
import { Connection, ConnectionOptions, createConnection } from 'typeorm'

import param from '../../../ormconfig'

export type PostgreSQLConfig = {
  host: string
  port: number
  username: string
  password: string
  database: string
  searchLanguage: 'en' | 'zh_cn'
  searchPlugin: string
}

export async function createDatabaseCon(): Promise<Connection> {
  if (!config.has('postgres')) {
    throw new Error('postgres config is missing')
  }

  return createConnection(param as ConnectionOptions)
}

export function getPostgreSQLConfig(): PostgreSQLConfig {
  return config.get<PostgreSQLConfig>('postgres')
}

export function getParticiple(cfg: PostgreSQLConfig) {
  return cfg.searchPlugin ? cfg.searchLanguage : 'simple'
}

export async function initDatabaseConRetry(count = 3, delay = 1000): Promise<void> {
  try {
    await createDatabaseCon()
    console.log('connect to databases successfully')
    return
  } catch (err) {
    if (count < 0) {
      throw err
    }
    console.error(`failed to connect to database, retrying`, err)
    await bluebird.delay(delay > 10000 ? 10000 : delay)
    await initDatabaseConRetry(count - 1, delay * 2)
  }
}
