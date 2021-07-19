import { randomInt } from 'crypto'
import _ from 'lodash'
import { EntityManager, getConnection, getRepository, In } from 'typeorm'

import { User } from '../core/user'
import { UserEntity } from '../entities/user'
import { InvalidArgumentError, UnauthorizedError } from '../error/error'
import { AccountStatus, UserInfoDTO } from '../types/user'
import { absoluteURI, getSecretKey } from '../utils/common'
import { decrypt, encrypt } from '../utils/crypto'
import { md5 } from '../utils/helper'
import emailService from './email'

type TokenPayload = {
  userId: string
  passHash: string
  expiresAt: number
}

export class UserService {
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
    return getConnection().transaction(async (t) => {
      const user = (await this.createUserByEmailsIfNotExist([email], t))[email]
      if (user.status === AccountStatus.VERIFYING) {
        return emailService.sendConfirmationEmail(user.id, email).then((code) => ({ user, code }))
      }
      return { user }
    })
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
  ): Promise<{ [k: string]: User }> {
    const r = t ? t.getRepository(UserEntity) : getRepository(UserEntity)
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
      .map((email) => {
        return r.create({
          username: '',
          email,
          avatar: absoluteURI(`/api/static/avatars/user-${randomInt(4)}.png`),
          password: '',
          status,
        })
      })
      .value()
    const insertedUsers = await r.save(inserts)
    return _([...users, ...insertedUsers])
      .map((u) => User.fromEntity(u))
      .keyBy('email')
      .value()
  }

  async getById(userId: string): Promise<User> {
    const user = await getRepository(UserEntity).findOneOrFail(userId)
    return User.fromEntity(user)
  }

  async confirmUser(code: string): Promise<{ id: string; status: AccountStatus }> {
    const payload = emailService.parseCode(code)
    if (_.now() > payload.expiresAt || payload.type !== 'confirm') {
      throw InvalidArgumentError.new('confirm link is expired')
    }
    const { userId } = payload
    const user = await getRepository(UserEntity).findOneOrFail(userId)
    if (![AccountStatus.VERIFYING,AccountStatus.CREATING].includes(user.status)) {
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
  getConvertedPassword(password: string, userId: string) {
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

  /**
   * @return { userId: string, expiresAt: number}
   */
  async verifyToken(token: string): Promise<{ userId: string; expiresAt: number }> {
    const payload = JSON.parse(decrypt(token, this.secretKey)) as TokenPayload
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
}

const service = new UserService()
export default service

/**
 * batch get user info
 */
async function getInfos(ids: string[]): Promise<UserInfoDTO[]> {
  const models = await getRepository(UserEntity).find({ id: In(ids) })
  return _.map(models, (u) => User.fromEntity(u).toDTO())
}

export { getInfos }
