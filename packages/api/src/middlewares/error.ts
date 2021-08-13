import { Context, Next } from 'koa'

export default async function error(ctx: Context, next: Next): Promise<void> {
  try {
    await next()
  } catch (err) {
    console.log(err)

    ctx.status = err.status || 500
    const { message, errMsg, upstreamErr } = err
    ctx.body = { upstreamErr, errMsg: errMsg || message }
  }
}
