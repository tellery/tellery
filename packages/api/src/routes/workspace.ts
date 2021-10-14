import { plainToClass, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { set } from 'lodash'

import workspaceService from '../services/workspace'
import { LoadMoreKey } from '../types/common'
import { PermissionWorkspaceRole } from '../types/permission'
import { hasSMTPHost, hex2String } from '../utils/common'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'

class ListWorkspacesRequest {
  @ValidateNested()
  next?: LoadMoreKey
}

class GetWorkspaceDetailRequest {
  @IsDefined()
  workspaceId!: string
}

class CreateWorkspaceRequest {
  @IsDefined()
  name!: string

  avatar?: string
}

class JoinWorkspaceRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  inviteCode!: string

  @IsDefined()
  // hex
  invitedByIdHex!: string

  getInvitedById(): string {
    return hex2String(this.invitedByIdHex)
  }
}

class LeaveWorkspaceRequest {
  @IsDefined()
  workspaceId!: string
}

class UserRole {
  @IsDefined()
  @IsEmail()
  email!: string

  role!: PermissionWorkspaceRole
}

class KickOutMembersRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  @IsArray()
  @Type(() => UserRole)
  userIds!: string[]
}

class UpdatePermissionWorkspaceRoleRequest {
  @IsDefined()
  userId!: string

  @IsDefined()
  workspaceId!: string

  @IsDefined()
  @IsEnum(PermissionWorkspaceRole)
  role!: PermissionWorkspaceRole
}

class GetWorkspaceViewRequest {
  @IsDefined()
  workspaceId!: string
}

class UpdateWorkspaceRequest {
  @IsDefined()
  workspaceId!: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsBoolean()
  resetInviteCode?: boolean
}

class GetWorkspaceViewByViewIdRequest {
  @IsDefined()
  id!: string
}

class UpdateWorkspacePreferencesRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  @IsNotEmptyObject()
  preferences!: Record<string, unknown>
}

async function listWorkspaces(ctx: Context) {
  const payload = plainToClass(ListWorkspacesRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const res = await workspaceService.list(user.id, payload.next)

  ctx.body = res
}

async function getWorkspaceDetail(ctx: Context) {
  const payload = plainToClass(GetWorkspaceDetailRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const workspace = await workspaceService.get(user.id, payload.workspaceId)

  // pad global configuration
  set(workspace, 'preferences.emailConfig', hasSMTPHost())

  ctx.body = { workspace }
}

async function updateWorkspace(ctx: Context) {
  const payload = plainToClass(UpdateWorkspaceRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const workspace = await workspaceService.update(user.id, payload.workspaceId, payload)

  ctx.body = { workspace }
}

async function createWorkspace(ctx: Context) {
  const payload = plainToClass(CreateWorkspaceRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const workspace = await workspaceService.create(user.id, payload.name, payload.avatar)

  ctx.body = { workspace }
}

async function joinWorkspace(ctx: Context) {
  const payload = plainToClass(JoinWorkspaceRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const workspace = await workspaceService.join(
    payload.workspaceId,
    user.id,
    payload.inviteCode,
    payload.getInvitedById(),
  )
  ctx.body = { workspace }
}

async function leaveWorkspace(ctx: Context) {
  const payload = plainToClass(LeaveWorkspaceRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  await workspaceService.leave(payload.workspaceId, user.id)

  ctx.body = { success: true }
}

async function kickoutMembers(ctx: Context) {
  const payload = plainToClass(KickOutMembersRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const workspace = await workspaceService.kickoutMembers(
    user.id,
    payload.workspaceId,
    payload.userIds,
  )
  ctx.body = { workspace }
}

async function updatePermissionWorkspaceRole(ctx: Context) {
  const payload = plainToClass(UpdatePermissionWorkspaceRoleRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const workspace = await workspaceService.updateRole(
    user.id,
    payload.workspaceId,
    payload.userId,
    payload.role,
  )
  ctx.body = { workspace }
}

async function getWorkspaceView(ctx: Context) {
  const payload = plainToClass(GetWorkspaceViewRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const view = await workspaceService.syncWorkspaceView(user.id, payload.workspaceId)
  ctx.body = view
}

async function getWorkspaceViewByViewId(ctx: Context) {
  const payload = plainToClass(GetWorkspaceViewByViewIdRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const view = await workspaceService.getWorkspaceViewByViewId(user.id, payload.id)
  ctx.body = view
}

async function updateWorkspacePreferences(ctx: Context) {
  const payload = plainToClass(UpdateWorkspacePreferencesRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)
  const updatedWorkspace = await workspaceService.updateWorkspacePreferences(
    user.id,
    payload.workspaceId,
    payload.preferences,
  )
  ctx.body = {
    workspace: updatedWorkspace,
  }
}

const router = new Router()

router.post('/list', listWorkspaces)
router.post('/getDetail', getWorkspaceDetail)
router.post('/update', updateWorkspace)
router.post('/create', createWorkspace)
router.post('/join', joinWorkspace)
router.post('/leave', leaveWorkspace)
router.post('/kickout', kickoutMembers)
router.post('/updateRole', updatePermissionWorkspaceRole)
router.post('/getView', getWorkspaceView)
router.post('/getViewByViewId', getWorkspaceViewByViewId)
router.post('/updatePreferences', updateWorkspacePreferences)

export default router
