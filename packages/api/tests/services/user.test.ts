import test from 'ava'
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../../src/clients/db/orm'
import { UserEntity } from '../../src/entities/user'
import userService from '../../src/services/user'
import { AccountStatus } from '../../src/types/user'

test.before(async () => {
  await createDatabaseCon()
})

test('generate verifying user', async (t) => {
  const email = nanoid()
  await userService.generateUserVerification(email)
  await userService.generateUserVerification(email)

  const user = await getRepository(UserEntity).findOne({ email })

  t.not(user, null)
  t.is(user?.status, AccountStatus.VERIFYING)
  t.not(user?.avatar, undefined)
})

test('confirm user', async (t) => {
  const email = nanoid()
  const { code } = await userService.generateUserVerification(email)
  const confirmedUser = await userService.confirmUser(code!)

  t.is(confirmedUser.status, AccountStatus.CONFIRMED)
})

test('update user info', async (t) => {
  const { id: userId } = await userService.confirmUser(
    (await userService.generateUserVerification(nanoid())).code!,
  )

  // user confirmed
  const user = await userService.updateUser(userId, {
    username: 'username',
    avatar: 'avatar',
    newPassword: 'newPassword',
    currentPassword: 'currentPassword',
  })

  t.is(user.username, 'username')
  t.is(user.status, AccountStatus.ACTIVE)
  t.is(user.password, userService.getConvertedPassword('newPassword', user.id))
})
