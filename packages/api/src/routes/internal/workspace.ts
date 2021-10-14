import { plainToClass, Type } from 'class-transformer'
import { IsArray, IsDefined, IsEnum, ValidateNested } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { PermissionWorkspaceRole } from '../../types/permission'
import { validate } from '../../utils/http'
import workspaceService from '../../services/workspace'

class UserRole {
  @IsDefined()
  userId!: string

  @IsEnum(PermissionWorkspaceRole)
  role!: PermissionWorkspaceRole
}

class AddMembersRequest {
  @IsDefined()
  operatorId!: string

  @IsDefined()
  workspaceId!: string

  @IsDefined()
  @IsArray()
  @Type(() => UserRole)
  @ValidateNested()
  users!: UserRole[]
}

async function addMembers(ctx: Context) {
  const payload = plainToClass(AddMembersRequest, ctx.request.body)
  await validate(ctx, payload)
  const { operatorId, workspaceId, users } = payload
  await workspaceService.addMembers(operatorId, workspaceId, users)
}
const router = new Router()

router.post('/addMembers', addMembers)

export default router
