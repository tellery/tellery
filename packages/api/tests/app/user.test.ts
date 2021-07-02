/* eslint no-param-reassign: ["error", { "props": false }] */
import test, { ExecutionContext } from 'ava'
import got from 'got/dist/source'
import { random } from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'

import app from '../../src'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { UserEntity } from '../../src/entities/user'
import userService from '../../src/services/user'
import { AccountStatus } from '../../src/types/user'
import { USER_TOKEN_HEADER_KEY } from '../../src/utils/user'

test.before.cb((t: ExecutionContext<any>) => {
  const port = random(8000, 20000, false)
  t.context.server = app
  t.context.server.listen(port, () => {
    t.context.prefixUrl = `http://localhost:${port}`
    createDatabaseCon().then(() => (t as any).end())
  })
})

test.after.always((t: ExecutionContext<any>) => {
  t.context.server.close()
})

test.serial('post api generate user', async (t: ExecutionContext<any>) => {
  try {
    await got<any>('api/users/generate', {
      prefixUrl: t.context.prefixUrl,
      method: 'POST',
      json: {
        email: 'test',
      },
    }).json()
    t.fail()
    // eslint-disable-next-line no-empty
  } catch (err) {}
  const resp: any = await got<any>('api/users/generate', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      email: `${nanoid()}@test.com`,
    },
  }).json()

  t.is(resp.status, AccountStatus.VERIFYING)
})

test.serial('post api confirm user', async (t: ExecutionContext<any>) => {
  const email = `${nanoid()}@test.com`
  const { code } = await userService.generateUserVerification(email)

  const resp = await got<any>('api/users/confirm', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      code,
    },
  })
  const headerToken = resp.headers[USER_TOKEN_HEADER_KEY]
  const cookieToken = resp.headers['set-cookie']

  const { status } = JSON.parse(resp.body)

  t.is(status, AccountStatus.CONFIRMED)
  t.not(headerToken, undefined)
  t.not(cookieToken, undefined)
})

test.serial('post login', async (t: ExecutionContext<any>) => {
  const email = `${nanoid()}@test.com`
  const password = 'Aaa1234567'

  const user = await getRepository(UserEntity)
    .create({
      username: nanoid(),
      avatar: 'https://tellery.io/avatar',
      password: userService.getConvertedPassword(password),
      email,
      status: AccountStatus.ACTIVE,
    })
    .save()

  const resp: any = await got<any>('api/users/login', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    json: {
      email,
      password,
    },
  })
  const headerToken = resp.headers[USER_TOKEN_HEADER_KEY]
  const cookieToken = resp.headers['set-cookie']
  const { id } = JSON.parse(resp.body)

  t.is(id, user.id)
  t.not(headerToken, undefined)
  t.not(cookieToken, undefined)
})

test.serial('post logout', async (t: ExecutionContext<any>) => {
  const resp: any = await got<any>('api/users/logout', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
  })

  t.is(resp.headers[USER_TOKEN_HEADER_KEY], '')
  t.not(resp.headers['set-cookie'], undefined)
})

test.serial('post api update user', async (t: ExecutionContext<any>) => {
  const email = `${nanoid()}@test.com`
  const password = 'Aaa1234567'

  const user = await getRepository(UserEntity)
    .create({
      username: nanoid(),
      avatar: 'https://tellery.io/avatar',
      password: userService.getConvertedPassword(password),
      email,
      status: AccountStatus.ACTIVE,
    })
    .save()

  // update base info
  const baseInfoResp: any = await got<any>('api/users/update', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    headers: {
      [USER_TOKEN_HEADER_KEY]: await userService.generateToken(user.id),
    },
    json: {
      avatar: 'https://tellery.io/new_avatar',
      name: 'username',
    },
  }).json()

  t.is(baseInfoResp.username, 'username')
  t.is(baseInfoResp.avatar, 'https://tellery.io/new_avatar')

  // update password
  const newPassword = 'Aa12345678'
  const resp = await got<any>('api/users/update', {
    prefixUrl: t.context.prefixUrl,
    method: 'POST',
    headers: {
      [USER_TOKEN_HEADER_KEY]: await userService.generateToken(user.id),
    },
    json: {
      newPassword,
      currentPassword: password,
    },
  })

  const model = await getRepository(UserEntity).findOneOrFail(user.id)

  const newPasswordHash = userService.getConvertedPassword(newPassword)
  t.is(newPasswordHash === model.password, true)
  t.not(resp.headers['set-cookie'], undefined)
})
