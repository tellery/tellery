import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'
import analyzeSqlService from '../services/analyzeSql'
import { convertToGraph } from '../utils/analyzeSql'

class AnalyzeSqlRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  queryId!: string

  convertToGraph?: boolean
}

async function analyzeSqlRouter(ctx: Context) {
  const payload = plainToClass(AnalyzeSqlRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const node = await analyzeSqlService.analyzeSql(user.id, payload.workspaceId, payload.queryId)
  if (payload.convertToGraph) {
    const graph = convertToGraph(node)
    graph.printAdjacentList()
    ctx.body = {
      graph: graph.toJSON(),
    }
  } else {
    ctx.body = {
      node: node.toJSON(),
    }
  }
}

const router = new Router()

router.post('/analyzeSql', analyzeSqlRouter)

export default router
