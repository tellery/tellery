import { Context, HttpError } from 'koa'
import { PassThrough, Readable } from 'stream'

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

  ctx.type = 'application/json'
  ctx.set({
    'Cache-Control': 'no-cache',
    'Content-Encoding': 'identity',
  })
  ctx.body = streamResponse

  const keepAlive = setInterval(() => {
    streamResponse.push('\n')
  }, 5000)

  await streamHandlerCb(streamResponse)

  streamResponse.on('close', () => {
    clearInterval(keepAlive)
  })
}

/*
  Promisified stream read
*/
export function readableStreamWrapper(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const bufs: Buffer[] = []
    stream.on('data', (chunk: Buffer) => {
      bufs.push(chunk)
    })
    stream.on('end', () => {
      resolve(Buffer.concat(bufs))
    })
    stream.on('error', (err: Error) => {
      reject(err)
    })
  })
}
