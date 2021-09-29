import { Context } from 'koa'
import { IOptions } from 'cookies'
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

/**
 * only use this function in the middleware
 * for request handling, set `ctx.auth_token` and delegate further logic to the user middleware
 */
export function setUserToken(ctx: Context, token: string | null): void {
  ctx.set(USER_TOKEN_HEADER_KEY, token ?? '')

  const sameSiteOpts: IOptions = ctx.request.secure
    ? {
        secure: true,
        sameSite: 'none',
      }
    : {}

  // if token is not valid, set expireAt to 1970-01-01
  const opts: IOptions = token
    ? {
        ...sameSiteOpts,
        maxAge: 60 * 60 * 24 * 365 * 1000,
      }
    : {
        expires: new Date(0),
      }
  ctx.cookies.set(USER_TOKEN_HEADER_KEY, token, opts)
}
