import { HTTPError, RequestError, Response } from 'got'
import { Context } from 'koa'
import { validate as valid } from 'class-validator'
import createError from 'http-errors'
import { get, toString } from 'lodash'

export function errorResponse(data: string | unknown): Record<'errMsg', string> {
  return get(data, 'errMsg') ? (data as Record<'errMsg', string>) : { errMsg: toString(data) }
}

export function getUpstreamHook(upstream: string): (err: RequestError) => RequestError {
  return (err) => {
    const error = err
    error.message = `${upstream}: ${err.message}`
    return error
  }
}

export async function validate(ctx: Context, payload: Object): Promise<void> {
  const errors = await valid(payload)
  if (errors.length > 0) {
    ctx.throw(400, errorResponse(errors[0].toString()))
  }
}

/**
 * envelope grpc error
 */
export async function beauty<T>(rawFunc: () => Promise<Response<T>>): Promise<T> {
  try {
    const res = await rawFunc()
    return res.body
  } catch (err) {
    if (err instanceof HTTPError) {
      const { response, message } = err
      throw createError(response.statusCode, {
        upstreamErr: errorResponse(response.body).errMsg,
        errMsg: message,
      })
    }
    throw err
  }
}
