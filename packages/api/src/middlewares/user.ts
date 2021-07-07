import { Context, Next } from 'koa'
import _ from 'lodash'

import userService from '../services/user'
import { USER_TOKEN_HEADER_KEY } from '../utils/user'

// 15 days
const d15 = 3600 * 24 * 15

export default async function user(ctx: Context, next: Next) {
  const token = ctx.headers[USER_TOKEN_HEADER_KEY] || ctx.cookies.get(USER_TOKEN_HEADER_KEY)
  let payload: { userId: string; expiresAt: number } | undefined

  if (token && _.isString(token)) {
    payload = await userService.verifyToken(token)
    ctx.state.user = { id: payload.userId }
  }

  const resp = await next()

  // refresh token
  if (payload && payload.expiresAt - d15 < _.now()) {
    ctx.auth_token = await userService.generateToken(payload.userId)
  }

  const { auth_token: at } = ctx

  // set token
  if (at || _.isNull(at)) {
    ctx.set(USER_TOKEN_HEADER_KEY, at ?? '')
    ctx.cookies.set(USER_TOKEN_HEADER_KEY, at, {
      expires: new Date(new Date().getTime() + 10 * 365 * 24 * 60 * 60), // never expires
    })
  }

  return resp
}
