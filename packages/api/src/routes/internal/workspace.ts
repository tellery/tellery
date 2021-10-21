import { plainToClass, Type } from 'class-transformer'
import { IsArray, IsDefined, IsEnum, ValidateNested } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { PermissionWorkspaceRole } from '../../types/permission'
import { validate } from '../../utils/http'
import workspaceService from '../../services/workspace'
import { LoadMoreKey } from '../../types/common'

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

class CreateWorkspaceRequest {
  @IsDefined()
  operatorId!: string

  @IsDefined()
  name!: string

  avatar?: string
}

class ListWorkspacesRequest {
  @IsDefined()
  operatorId!: string

  @ValidateNested()
  next?: LoadMoreKey
}

class GetWorkspaceDetailRequest {
  @IsDefined()
  operatorId!: string

  @IsDefined()
  workspaceId!: string
}

async function listWorkspaces(ctx: Context) {
  const payload = plainToClass(ListWorkspacesRequest, ctx.request.body)
  await validate(ctx, payload)

  const { operatorId, next } = payload
  const res = await workspaceService.list(operatorId, next)
  ctx.body = res
}

async function getWorkspaceDetail(ctx: Context) {
  const payload = plainToClass(GetWorkspaceDetailRequest, ctx.request.body)
  await validate(ctx, payload)

  const { operatorId, workspaceId } = payload
  const workspace = await workspaceService.get(operatorId, workspaceId)
  ctx.body = { workspace }
}

async function createWorkspace(ctx: Context) {
  const payload = plainToClass(CreateWorkspaceRequest, ctx.request.body)
  await validate(ctx, payload)

  const { operatorId, name, avatar } = payload
  const workspace = await workspaceService.create(operatorId, name, avatar)

  ctx.body = { workspace }
}

async function addMembers(ctx: Context) {
  const payload = plainToClass(AddMembersRequest, ctx.request.body)
  await validate(ctx, payload)

  const { operatorId, workspaceId, users } = payload
  await workspaceService.addMembers(operatorId, workspaceId, users)

  ctx.body = {}
}

const router = new Router()

router.post('/list', listWorkspaces)
router.post('/getDetail', getWorkspaceDetail)
router.post('/addMembers', addMembers)
router.post('/create', createWorkspace)

export default router
