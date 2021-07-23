import test from 'ava'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import metabase from '../../../src/thridParty/metabase'
import { createMetabaseSecret } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('generate metabase token', async (t) => {
  const host = 'metabase.tellery.io'
  await createMetabaseSecret(host)
  const token = await metabase.generateToken(`https://${host}`, { dashboard: 1 })
  t.not(token, undefined)
})
