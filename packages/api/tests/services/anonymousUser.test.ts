import test from 'ava'
import _ from 'lodash'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { AnonymousUserService } from '../../src/services/user'

const userService = new AnonymousUserService()
test.before(async () => {
  await createDatabaseCon()
})

test('anonymous verifying token', async (t) => {
  const { userId, expiresAt } = await userService.verifyToken('invalid')

  t.not(userId, undefined)
  t.is(expiresAt - _.now() < 3600 * 1000 + 1, true)
})
