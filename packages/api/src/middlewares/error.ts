import { Context, Next } from 'koa'
import { setUserToken } from '../utils/user'

export default async function error(ctx: Context, next: Next): Promise<void> {
  try {
    await next()
  } catch (err: any) {
    console.log(err)

    ctx.status = err.status || 500
    // if unauthorized error appears, no matter how, invalidate cookies
    if (ctx.status === 401) {
      setUserToken(ctx, null)
    }
    const { message, errMsg, upstreamErr } = err
    ctx.body = { upstreamErr, errMsg: errMsg || message }
  }
}
