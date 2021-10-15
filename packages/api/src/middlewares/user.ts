import { Context, Next } from 'koa'
import _ from 'lodash'
import { getRepository } from 'typeorm'
import { WorkspaceEntity } from '../entities/workspace'

import userService from '../services/user'
import workspaceService from '../services/workspace'
import { PermissionWorkspaceRole } from '../types/permission'
import { isAnonymous } from '../utils/env'
import { setUserToken, USER_TOKEN_HEADER_KEY } from '../utils/user'

const ignorePaths = ['/api/users/login', '/api/internal']

// 15 days
const d15 = 1000 * 3600 * 24 * 15

export default async function user(ctx: Context, next: Next): Promise<unknown> {
  const token = ctx.headers[USER_TOKEN_HEADER_KEY] || ctx.cookies.get(USER_TOKEN_HEADER_KEY)
  let payload: { userId: string; expiresAt: number } | undefined
  const skip = ignorePaths.some((p) => ctx.path.startsWith(p))

  if (skip) {
    if (token && _.isString(token)) {
      payload = await userService.verifyToken(token)
    } else if (isAnonymous() && ctx.path === '/api/users/me') {
      // special logic for anonymous users
      payload = await userService.verifyToken(token?.toString() ?? '')
      // invited new user to workspace
      if (_(payload).get('generated')) {
        const workspace = await getRepository(WorkspaceEntity).findOneOrFail({
          order: {
            createdAt: 'ASC',
          },
          relations: ['members'],
        })
        const admin = _(workspace.members).find((m) => m.role === PermissionWorkspaceRole.ADMIN)
        if (!admin) {
          throw new Error('missing super user')
        }
        await workspaceService.addMembers(admin.userId, workspace.id, [
          {
            userId: payload.userId,
            role: PermissionWorkspaceRole.MEMBER,
          },
        ])
      }
    }
  }

  if (payload) {
    ctx.state.user = { id: payload.userId }
  }

  const resp = await next()

  // refresh token
  if (token && _.isString(token) && payload && payload.expiresAt - d15 < _.now()) {
    ctx.auth_token = await userService.refreshToken(token)
  }

  const { auth_token: at } = ctx

  // set token
  if (at || _.isNull(at)) {
    setUserToken(ctx, at)
  }

  return resp
}
