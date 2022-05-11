import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { defaultUserService as userService } from '../services/user'
import { validate } from '../utils/http'
import config from 'config'
import fetch from 'node-fetch'

class LoginRequest {
  @IsDefined()
  code!: string
}

interface OAuthUser {
  name: string
  picture: string
  email: string
}

function setToken(ctx: Context, token: string | null) {
  // set cookie and header in user middleware
  ctx.auth_token = token
}

interface OAuth2Config {
  clientId: string
  clientSecret: string
  redirectUrl: string
  userUrl: string
  userMethod: string
  scope: string
  grantType: string
  tokenUrl: string
}

class OAuth2 {
  clientId: string

  clientSecret: string

  tokenUrl: string

  userUrl: string

  userMethod: string

  grantType: string

  scope: string

  redirectUrl: string

  constructor(options: OAuth2Config) {
    this.clientId = options.clientId
    this.clientSecret = options.clientSecret
    this.tokenUrl = options.tokenUrl
    this.userUrl = options.userUrl
    this.userMethod = options.userMethod
    this.grantType = options.grantType
    this.scope = options.scope
    this.redirectUrl = options.redirectUrl
  }

  async getToken(code: string) {
    const response = await fetch(`${this.tokenUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: this.grantType,
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUrl,
        scope: this.scope,
      }),
    }).then((res) => res.json() as Promise<{ access_token: string; refresh_token: string }>)

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    }
  }

  async getUser(code: string): Promise<OAuthUser> {
    const { accessToken } = await this.getToken(code)
    const response = await fetch(`${this.userUrl}?access_token=${accessToken}`, {
      method: this.userMethod,
    })

    if (response.ok) {
      const user = (await response.json()) as OAuthUser

      return user
    } else {
      throw new Error(response.statusText)
    }
  }
}

const client = new OAuth2({
  clientId: config.get('oauth.clientId'),
  clientSecret: config.get('oauth.clientSecret'),
  tokenUrl: config.get('oauth.tokenUrl'),
  userUrl: config.get('oauth.userUrl'),
  userMethod: config.get('oauth.userMethod'),
  grantType: config.get('oauth.grantType'),
  scope: config.get('oauth.scope'),
  redirectUrl: config.get('oauth.redirectUrl'),
})

async function loginOrSignUpViaOauth(ctx: Context) {
  const payload = plainToClass(LoginRequest, ctx.request.body)
  await validate(ctx, payload)

  const oauthUser = await client.getUser(payload.code)

  const user = await userService.createUserIfNotExists({
    email: oauthUser.email,
    username: oauthUser.name,
    avatar: oauthUser.picture,
  })

  const token = await userService.generateToken(user.id)
  setToken(ctx, token)
  ctx.body = user.toDTO()
}

const router = new Router()

router.post('/login', loginOrSignUpViaOauth)

export default router
