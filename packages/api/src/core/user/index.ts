import { UserEntity } from '../../entities/user'
import { AccountStatus, UserInfoDTO } from '../../types/user'
import { Common } from '../common'

export class User extends Common {
  id: string

  username: string

  email: string

  avatar?: string

  password: string

  status: AccountStatus

  constructor(
    id: string,
    username: string,
    email: string,
    password: string,
    status: AccountStatus,
    version: number,
    avatar?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(version, createdAt, updatedAt)
    this.id = id
    this.username = username
    this.email = email
    this.avatar = avatar
    this.status = status
    this.password = password
  }

  static fromEntity(model: UserEntity): User {
    return new User(
      model.id,
      model.username,
      model.email,
      model.password,
      model.status,
      model.version,
      model.avatar,
      model.createdAt,
      model.updatedAt,
    )
  }

  toDTO(): UserInfoDTO {
    return {
      id: this.id,
      name: this.username,
      username: this.username,
      avatar: this.avatar,
      email: this.email,
      status: this.status,
    }
  }
}
