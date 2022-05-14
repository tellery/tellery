import _ from 'lodash'
import config from 'config'
import got, { Got } from 'got'
import { nanoid } from 'nanoid'
import { EntityManager, getManager, getRepository, In } from 'typeorm'

import { User } from '../core/user'
import { UserEntity } from '../entities/user'
import { InvalidArgumentError, UnauthorizedError } from '../error/error'
import { PermissionWorkspaceRole } from '../types/permission'
import { AccountStatus, UserInfoDTO } from '../types/user'
import { getSecretKey } from '../utils/common'
import { decrypt, encrypt } from '../utils/crypto'
import { isSaaS, isAnonymous } from '../utils/env'
import { md5 } from '../utils/helper'
import { beauty, getUpstreamHook } from '../utils/http'
import emailService from './email'
import workspaceService from './workspace'

type TokenPayload = {
  userId: string
  passHash: string
  expiresAt: number
}

interface IUserService {
  /**
   * in the scene of SaaS deployment, following methods are delegated to its own user service
   *   - login
   *   - generateUserVerification
   *   - inviteMembersToWorkspace
   *   - createUserByEmails
   *   - confirmUser
   *   - updateUser
   *   - generateToken
   *   Thus those routes will be hidden and workspaceService.addMembers will be exposed
   */

  refreshToken(currentToken: string): Promise<string>

  verifyToken(token: string): Promise<{
    userId: string
    expiresAt: number
  } | null>

  getInfos(ids: string[]): Promise<UserInfoDTO[]>
}

export class UserService implements IUserService {
  private secretKey: string

  private compatible: boolean

  constructor() {
    // ignore this, this is used for earlier version
    this.compatible = !!process.env.COMPATIBLE
    this.secretKey = getSecretKey()
  }

  async login(email: string, password: string): Promise<User> {
    const model = await getRepository(UserEntity).findOne({ email })
    if (!model) {
      throw InvalidArgumentError.new('incorrect password')
    }
    const convertedPassword = this.getConvertedPassword(password, model.id)
    if (convertedPassword !== model.password) {
      throw InvalidArgumentError.new('incorrect password')
    }
    return User.fromEntity(model)
  }

  /**
   *
   * @returns code
   */
  async generateUserVerification(email: string): Promise<{ user: User; code?: string }> {
    return getManager().transaction(async (t) => {
      const user = (await this.createUserByEmailsIfNotExist([email], t))[email]
      if (user.status === AccountStatus.VERIFYING) {
        return emailService.sendConfirmationEmail(user.id, email).then((code) => ({ user, code }))
      }
      return { user }
    })
  }

  async inviteMembersToWorkspace(
    operatorId: string,
    workspaceId: string,
    users: { email: string; role: PermissionWorkspaceRole }[],
  ): Promise<{ email: string; inviteLink: string }[]> {
    const emails = _(users).map('email').value()
    const { name } = await workspaceService.mustFindOneWithMembers(workspaceId)
    return getManager().transaction(async (t) => {
      const userMap = await this.createUserByEmailsIfNotExist(emails, t, AccountStatus.CREATING)
      const userWithRole = _(users)
        .map(({ email, role }) => ({ userId: userMap[email].id, role }))
        .value()
      await workspaceService.addMembers(operatorId, workspaceId, userWithRole, t)
      return emailService.sendInvitationEmails(
        operatorId,
        _(userMap)
          .values()
          .map((u) => ({ userId: u.id, email: u.email }))
          .value(),
        name,
      )
    })
  }

  async createUserIfNotExists({
    email,
    username,
    avatar,
  }: {
    email: string
    username: string
    avatar: string
  }): Promise<User> {
    const r = getManager().getRepository(UserEntity)
    const user = await r.findOne({
      email: email,
    })
    if (user) {
      return User.fromEntity(user)
    } else {
      const insert = r.create({
        username: username ?? email.split('@')[0] ?? email,
        email: email,
        avatar: avatar,
        status: AccountStatus.ACTIVE,
      })
      const insertedUser = await r.save(insert)
      return User.fromEntity(insertedUser)
    }
  }

  /**
   *
   * @returns key: email
   */
  async createUserByEmailsIfNotExist(
    emails: string[],
    t?: EntityManager,
    // user init status
    status?: AccountStatus,
  ): Promise<{ [email: string]: User }> {
    const r = (t ?? getManager()).getRepository(UserEntity)
    const users = await r.find({
      email: In(emails),
    })
    if (users.length === emails.length) {
      return _(users)
        .map((u) => User.fromEntity(u))
        .keyBy('email')
        .value()
    }
    const missing = _.difference(emails, _(users).map('email').value())

    const inserts = _(missing)
      .map((email) =>
        r.create({
          username: email.split('@')[0] || email,
          email,
          password: '',
          status,
        }),
      )
      .value()
    const insertedUsers = await r.save(inserts)
    return _([...users, ...insertedUsers])
      .map((u) => User.fromEntity(u))
      .keyBy('email')
      .value()
  }

  async confirmUser(code: string): Promise<{ id: string; status: AccountStatus }> {
    const payload = emailService.parseCode(code)
    if (_.now() > payload.expiresAt || payload.type !== 'confirm') {
      throw InvalidArgumentError.new('confirm link is expired')
    }
    const { userId } = payload
    const user = await getRepository(UserEntity).findOneOrFail(userId)
    if (![AccountStatus.VERIFYING, AccountStatus.CREATING].includes(user.status)) {
      return { id: user.id, status: user.status }
    }
    user.status = AccountStatus.CONFIRMED
    return user.save().then((u) => ({ id: u.id, status: u.status }))
  }

  async updateUser(
    userId: string,
    params: {
      username?: string
      avatar?: string
      newPassword?: string
      currentPassword?: string
    } = {},
  ): Promise<User> {
    const { username, avatar, newPassword, currentPassword } = params
    const user = await getRepository(UserEntity).findOneOrFail(userId)
    if (username) {
      user.username = username
    }
    if (avatar) {
      user.avatar = avatar
    }
    if (newPassword) {
      if (
        user.status === AccountStatus.CONFIRMED ||
        this.getConvertedPassword(currentPassword ?? '', userId) === user.password
      ) {
        user.password = this.getConvertedPassword(newPassword, userId)
      } else {
        throw InvalidArgumentError.new('current password is not correct')
      }
    }

    user.status = AccountStatus.ACTIVE
    const newUser = await user.save()
    return User.fromEntity(newUser)
  }

  /**
   * visible for testing
   */
  getConvertedPassword(password: string, userId: string): string {
    return md5(this.secretKey + password + (this.compatible ? '' : userId.substring(0, 8)))
  }

  async generateToken(user: string): Promise<string> {
    const model = await getRepository(UserEntity).findOneOrFail(user)
    return encrypt(
      JSON.stringify({
        userId: user,
        expiresAt: _.now() + 30 * 24 * 3600 * 1000, // 30 days
        passHash: this.getConvertedPassword(model.password, user),
      } as TokenPayload),
      this.secretKey,
    )
  }

  private decryptToken(token: string): TokenPayload {
    return JSON.parse(decrypt(token, this.secretKey))
  }

  /**
   * @return { userId: string, expiresAt: number}
   */
  async verifyToken(token: string): Promise<{ userId: string; expiresAt: number } | null> {
    let payload: TokenPayload | null = null
    try {
      payload = this.decryptToken(token)
    } catch (e) {
      return null
    }
    if (payload.expiresAt < _.now()) {
      throw UnauthorizedError.notLogin()
    }
    let model: UserEntity
    try {
      model = await getRepository(UserEntity).findOneOrFail(payload.userId)
    } catch (_err) {
      throw UnauthorizedError.notExist()
    }
    const passHash = this.getConvertedPassword(model.password, model.id)
    if (passHash !== payload.passHash) {
      throw UnauthorizedError.notLogin()
    }

    return payload
  }

  async refreshToken(token: string): Promise<string> {
    const { userId } = this.decryptToken(token)
    return this.generateToken(userId)
  }

  async getInfos(ids: string[]): Promise<UserInfoDTO[]> {
    const models = await getRepository(UserEntity).find({ id: In(ids) })
    return _.map(models, (u) => User.fromEntity(u).toDTO())
  }
}

export class AnonymousUserService extends UserService {
  /**
   * if the token validation fails, it will create a new user and return a mock payload of token
   * its expiresAt is in line with the requirements of regenerating new token
   * so the user middleware will generate a new token cookie for users
   * @returns generated: the user is created by this function
   */
  async verifyToken(token: string): Promise<{ userId: string; expiresAt: number } | null> {
    console.debug('anonymous ....................')

    return super.verifyToken(token).catch(async (err) => {
      console.debug(err)
      const email = this.randomEmail()
      const user = (
        await this.createUserByEmailsIfNotExist([email], undefined, AccountStatus.ACTIVE)
      )[email]
      await this.updateUser(user.id, { username: `Anonymous-${nanoid(4)}` })
      return {
        userId: user.id,
        expiresAt: _.now() + 3600 * 1000,
        generated: true,
        email: user.email,
      }
    })
  }

  async generateUserVerification(): Promise<never> {
    throw InvalidArgumentError.notSupport('generating verification')
  }

  private randomEmail(): string {
    return `${nanoid()}@tellery.demo`
  }
}

export class SaaSExternalUserService implements IUserService {
  private got: Got = got.extend({
    hooks: {
      beforeError: [getUpstreamHook('CloudUserService')],
    },
    prefixUrl: config.get<string>('deploy.userServiceEndpoint'),
    timeout: 5000,
    responseType: 'json',
  })

  async verifyToken(token: string): Promise<{ userId: string; expiresAt: number }> {
    return beauty(() =>
      this.got
        .post<{ userId: string; expireAt: number }>('/v1/internal/user/jwt/verify', {
          json: {
            token,
          },
        })
        .json(),
    )
  }

  async refreshToken(currentToken: string): Promise<string> {
    const { data } = await beauty<{ data: string }>(() =>
      this.got
        .post('/v1/internal/user/jwt/refresh', {
          json: {
            token: currentToken,
          },
        })
        .json(),
    )
    return data
  }

  async getInfos(ids: string[]): Promise<UserInfoDTO[]> {
    const { data } = await beauty<{ data: UserInfoDTO[] }>(() =>
      this.got
        .get('/v1/internal/user/batchGet', {
          json: ids,
        })
        .json(),
    )
    return data
  }
}

const service: IUserService = isSaaS()
  ? new SaaSExternalUserService()
  : isAnonymous()
  ? new AnonymousUserService()
  : new UserService()
export default service
export const defaultUserService = service as UserService
