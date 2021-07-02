import { plainToClass } from 'class-transformer'
import { IsDefined, IsEmail, IsOptional, IsUrl, Matches, MaxLength } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'

import userService from '../services/user'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'

class UpdateUserInfoRequest {
  @IsUrl()
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

async function getUserInfo(ctx: Context) {
  const user = await userService.getById(mustGetUser(ctx).id)
  ctx.body = user.toDTO()
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
  setToken(ctx, null)
  ctx.body = { success: true }
}

function setToken(ctx: Context, token: string | null) {
  // set cookie and header in user middleware
  ctx.auth_token = token
}

const router = new Router()

router.post('/update', updateUserInfo)
router.post('/generate', generateUser)
router.post('/confirm', confirmUser)
router.post('/me', getUserInfo)
router.post('/login', login)
router.post('/logout', logout)

export default router
