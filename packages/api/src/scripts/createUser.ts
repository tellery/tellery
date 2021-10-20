import 'reflect-metadata'
import { getConnection } from 'typeorm'

import { createDatabaseCon } from '../clients/db/orm'
import { UserEntity } from '../entities/user'
import { defaultUserService } from '../services/user'
import { AccountStatus } from '../types/user'

async function main() {
  await createDatabaseCon()

  const email = process.env.CREATE_USER_EMAIL
  const username = process.env.CREATE_USER_NAME
  const password = process.env.CREATE_USER_PASSWORD

  if (!email || !username || !password) {
    throw new Error(
      'must set env "CREATE_USER_EMAIL" and "CREATE_USER_NAME" and "CREATE_USER_PASSWORD"',
    )
  }

  return getConnection().transaction(async (t) => {
    const users = await defaultUserService.createUserByEmailsIfNotExist(
      [email],
      t,
      AccountStatus.ACTIVE,
    )
    const user = users[email]
    const md5Pass = defaultUserService.getConvertedPassword(password, user.id)
    return t.getRepository(UserEntity).update(user.id, { username, password: md5Pass })
  })
}

main()
  .then(() => {
    console.log('create user successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.log('create user failed', err)
    process.exit(1)
  })
