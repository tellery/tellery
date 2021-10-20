import { plainToClass, Type } from 'class-transformer'
import {
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { NotFoundError } from '../error/error'

import { defaultUserService as userService } from '../services/user'
import { PermissionWorkspaceRole } from '../types/permission'
import { isAnonymous } from '../utils/env'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'
class UpdateUserInfoRequest {
  @IsOptional()
  avatar?: string

  @MaxLength(50)
  @IsOptional()
  name?: string

  // 8-25 characters, at least a capital letter, a small letter and a number, and arbitrary characters for remaining
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{8,25}$/i)
  @IsOptional()
  newPassword?: string

  @IsOptional()
  currentPassword?: string

  // alias
  get username() {
    return this.name
  }
}

class ConfirmUserRequest {
  @IsDefined()
  code!: string
}

class GenerateUserRequest {
  @IsDefined()
  @IsEmail()
  email!: string
}

class LoginRequest {
  @IsDefined()
  @IsEmail()
  email!: string

  @IsDefined()
  password!: string
}

class UserRole {
  @IsDefined()
  @IsEmail()
  email!: string

  @IsEnum(PermissionWorkspaceRole)
  role!: PermissionWorkspaceRole
}
class InviteMembersToWorkspaceRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  @IsArray()
  @Type(() => UserRole)
  @ValidateNested()
  users!: UserRole[]
}

async function getUserInfo(ctx: Context) {
  const userId = mustGetUser(ctx).id
  const [user] = await userService.getInfos([userId])
  if (!user) {
    throw NotFoundError.resourceNotFound(userId)
  }
  ctx.body = user
}

async function updateUserInfo(ctx: Context) {
  const payload = plainToClass(UpdateUserInfoRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const userResp = await userService.updateUser(user.id, payload)
  if (payload.newPassword) {
    const token = await userService.generateToken(user.id)
    setToken(ctx, token)
  }
  ctx.body = userResp.toDTO()
}

async function confirmUser(ctx: Context) {
  const payload = plainToClass(ConfirmUserRequest, ctx.request.body)
  await validate(ctx, payload)

  const res = await userService.confirmUser(payload.code)
  const token = await userService.generateToken(res.id)

  setToken(ctx, token)
  ctx.body = res
}

async function generateUser(ctx: Context) {
  const payload = plainToClass(GenerateUserRequest, ctx.request.body)
  await validate(ctx, payload)

  const { user } = await userService.generateUserVerification(payload.email)
  ctx.body = { status: user.status }
}

async function login(ctx: Context) {
  const payload = plainToClass(LoginRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = await userService.login(payload.email, payload.password)
  const token = await userService.generateToken(user.id)
  setToken(ctx, token)
  ctx.body = user.toDTO()
}

async function logout(ctx: Context) {
  // for anonymous user service, logout does not clean cookies / header
  if (!isAnonymous()) {
    setToken(ctx, null)
  }
  ctx.body = { success: true }
}

function setToken(ctx: Context, token: string | null) {
  // set cookie and header in user middleware
  ctx.auth_token = token
}

async function inviteMembersToWorkspace(ctx: Context) {
  const payload = plainToClass(InviteMembersToWorkspaceRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const res = await userService.inviteMembersToWorkspace(
    user.id,
    payload.workspaceId,
    payload.users,
  )
  ctx.body = res
}

const router = new Router()

router.post('/update', updateUserInfo)
router.post('/generate', generateUser)
router.post('/confirm', confirmUser)
router.post('/me', getUserInfo)
router.post('/login', login)
router.post('/logout', logout)
router.post('/inviteMembersToWorkspace', inviteMembersToWorkspace)

export default router
