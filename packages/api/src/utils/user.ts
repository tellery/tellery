import { Context } from 'koa'
import { getRepository } from 'typeorm'
import { User } from '../core/user'
import { UserEntity } from '../entities/user'

import { UnauthorizedError } from '../error/error'
import { isAnonymous } from './env'

export const USER_TOKEN_HEADER_KEY = 'x-user-token'

let superUser: User | undefined

export function mustGetUser(ctx: Context): { id: string } {
  const user = getUser(ctx)
  if (!user) {
    throw UnauthorizedError.notLogin()
  }
  return user
}

export function getUser(ctx: Context): { id: string } | undefined {
  const { user } = ctx.state
  if (!user) {
    if (process.env.NODE_ENV === 'local') {
      return { id: '5fc9ef12e0f5e723bbff2782' }
    }
    if (process.env.NODE_ENV === 'test') {
      return { id: '942194da-d7db-4fbe-9887-3db5ef8c1234' }
    }
  }
  return user
}

/**
 * this function is only used in anonymous mode
 * TODO: A more elegant implementation
 */
export async function getSuperUser(): Promise<User> {
  if (!isAnonymous()) {
    throw new Error('not allowed')
  }
  if (superUser) {
    return superUser
  }
  const user = await getRepository(UserEntity).findOneOrFail({ order: { createdAt: 'ASC' } })
  superUser = User.fromEntity(user)
  return superUser
}
