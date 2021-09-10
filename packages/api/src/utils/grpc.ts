import grpc from 'grpc'
import createError from 'http-errors'
import { promisify } from 'util'
import { errorResponse } from './http'

type UnaryCallWithOption<ReqT, RespT> = (
  request: ReqT,
  metadata: grpc.Metadata,
  options: Partial<grpc.CallOptions>,
  callback: (error: grpc.ServiceError | null, response: RespT) => void,
) => grpc.ClientUnaryCall

export function beautyCall<ReqT, RespT>(
  func: UnaryCallWithOption<ReqT, RespT>,
  client: grpc.Client,
  request: ReqT,
  metadata?: grpc.Metadata,
  options?: Partial<grpc.CallOptions>,
  errCount = 0,
): Promise<RespT> {
  return promisify(func)
    .bind(client)(request, metadata || new grpc.Metadata(), options || {})
    .catch((e: grpc.ServiceError) => {
      if (errCount < 3 && e.code && e.code === grpc.status.UNAVAILABLE) {
        return beautyCall(func, client, request, metadata, options, errCount + 1)
      }
      let code: number
      switch (e.code) {
        case grpc.status.UNKNOWN:
          code = 500
          break
        case grpc.status.NOT_FOUND:
          code = 404
          break
        default:
          code = 400
      }
      throw createError(code, {
        upstreamErr: errorResponse(e.details).errMsg,
        errMsg: e.message,
      })
    })
}

export function beautyStream<RespT>(
  stream: grpc.ClientReadableStream<RespT>,
  errorHandler: (e: Error) => void = (e) => {
    console.error(e)
  },
) {
  return stream.on('error', (e: grpc.ServiceError) => {
    errorHandler(
      createError(e.code === 2 ? 500 : 400, {
        upstreamErr: errorResponse(e.details).errMsg,
        errMsg: e.message,
      }),
    )
  })
}
