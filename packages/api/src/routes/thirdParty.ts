import { plainToClass } from 'class-transformer'
import { Context } from 'koa'
import Router from 'koa-router'
import { validate } from '../utils/http'
import metabase from '../thridParty/metabase'
import { IsDefined, IsObject, IsUrl } from 'class-validator'

class GenerateMetabaseTokenRequest {
  @IsDefined()
  @IsUrl()
  siteUrl!: string

  @IsDefined()
  @IsObject()
  payload!: {
    resource: { dashboard?: number; question?: number }
    params: { [k: string]: string }
  }
}

async function generateMetabaseToken(ctx: Context) {
  const payload = plainToClass(GenerateMetabaseTokenRequest, ctx.request.body)
  await validate(ctx, payload)

  const { resource, params } = payload.payload

  const token = await metabase.generateToken(payload.siteUrl, resource, params)
  ctx.body = {
    token,
  }
}

const router = new Router()

router.post('/metabase/token', generateMetabaseToken)

export default router
