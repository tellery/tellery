import { Context } from 'koa'

import { UnauthorizedError } from '../error/error'

export const USER_TOKEN_HEADER_KEY = 'x-user-token'

function mustGetUser(ctx: Context): { id: string } {
  const user = getUser(ctx)
  if (!user) {
    throw UnauthorizedError.notLogin()
  }
  return user
}

function getUser(ctx: Context): { id: string } | undefined {
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

export { mustGetUser, getUser }
