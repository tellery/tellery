import { plainToClass } from 'class-transformer'
import { Context } from 'koa'
import Router from 'koa-router'

import { SearchableResourceType } from '../core/search/interface'
import searchService from '../services/search'
import { BlockType } from '../types/block'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'
import { GlobalSearchRequest } from './global'

/**
 * search question blocks by sql
 * TODO: deprecate sql search or add metric into searched result
 */
async function search(ctx: Context) {
  const payload = plainToClass(GlobalSearchRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const res = await searchService.searchResources(
    user.id,
    payload.workspaceId,
    payload.keyword,
    [SearchableResourceType._SQL],
    payload.limit,
    { ...payload.filters, type: BlockType.SQL },
  )
  ctx.body = res
}

const router = new Router()

router.post('/search', search)
export default router
