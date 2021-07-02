import { Context, HttpError } from 'koa'
import { PassThrough } from 'stream'

export function streamHttpErrorCb(streamResponse: PassThrough) {
  return (err: Error) => {
    console.error(err)
    if (err instanceof HttpError) {
      const { message, errMsg, upstreamErr } = err
      streamResponse.push(JSON.stringify({ upstreamErr, errMsg: errMsg || message }))
      streamResponse.end()
    }
  }
}

/*
 Assign an PassThrough stream into ctx.body, sending \n to the stream to keep the connection alive
 (for time-consuming request handling)
*/
export async function withKeepaliveStream(
  ctx: Context,
  streamHandlerCb: (streamResposne: PassThrough) => Promise<void>,
) {
  const streamResponse = new PassThrough()

  ctx.headers['Content-Type'] = 'application/json;charset=utf8'
  ctx.body = streamResponse

  const keepAlive = setInterval(() => {
    streamResponse.push('\n')
  }, 5000)

  await streamHandlerCb(streamResponse)

  streamResponse.on('close', () => {
    clearInterval(keepAlive)
  })
}
