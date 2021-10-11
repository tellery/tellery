import _ from 'lodash'
import { nanoid } from 'nanoid'
import { EntityManager, getManager, getRepository, In, LessThan } from 'typeorm'
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel'

import { getIPermission, IPermission } from '../core/permission'
import { User } from '../core/user'
import { Workspace } from '../core/workspace'
import { WorkspaceMember } from '../core/workspace/workspaceMember'
import { WorkspaceView } from '../core/workspaceView'
import { UserEntity } from '../entities/user'
import { WorkspaceEntity } from '../entities/workspace'
import { WorkspaceMemberEntity } from '../entities/workspaceMember'
import { WorkspaceViewEntity } from '../entities/workspaceView'
import { InvalidArgumentError, NotFoundError } from '../error/error'
import { LoadMoreKey } from '../types/common'
import { PermissionWorkspaceRole } from '../types/permission'
import { AccountStatus } from '../types/user'
import { WorkspaceDTO, WorkspaceMemberStatus } from '../types/workspace'
import { WorkspaceViewDTO } from '../types/workspaceView'
import { string2Hex } from '../utils/common'
import { isAnonymous } from '../utils/env'
import { loadMore } from '../utils/loadMore'
import { canGetWorkspaceData, canUpdateWorkspaceData } from '../utils/permission'
import emailService from './email'
import userService from './user'

// TODO: record activities
export class WorkspaceService {
  protected permission: IPermission
  protected isolationLevel: IsolationLevel = 'SERIALIZABLE'

  constructor(p: IPermission) {
    this.permission = p
  }

  async mustFindOneWithMembers(workspaceId: string, manager?: EntityManager): Promise<Workspace> {
    const model = await (manager
      ? manager.getRepository(WorkspaceEntity)
      : getRepository(WorkspaceEntity)
    ).findOne(workspaceId, {
      relations: ['members'],
    })

    if (!model) {
      throw NotFoundError.resourceNotFound(workspaceId)
    }

    return Workspace.fromEntity(model)
  }

  /**
   * get workspace detail
   */
  async get(operatorId: string, workspaceId: string): Promise<WorkspaceDTO> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    return this.mustFindOneWithMembers(workspaceId).then((w) => w.toDTO(operatorId))
  }

  async update(
    operatorId: string,
    workspaceId: string,
    params: {
      name?: string
      avatar?: string
      resetInviteCode?: boolean
    },
  ): Promise<WorkspaceDTO> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    const workspace = await getRepository(WorkspaceEntity).findOneOrFail(workspaceId)
    const { name, avatar, resetInviteCode } = params
    if (name) {
      workspace.name = name
    }

    if (avatar) {
      workspace.avatar = avatar
    }

    if (resetInviteCode) {
      workspace.inviteCode = this.generateInviteCode()
    }

    await workspace.save()
    const newWorkspace = await this.mustFindOneWithMembers(workspaceId)

    return newWorkspace.toDTO(operatorId)
  }

  async list(
    operatorId: string,
    next?: LoadMoreKey,
  ): Promise<{ workspaces: WorkspaceDTO[]; next?: LoadMoreKey }> {
    const { limit = 20, timestamp = _.now() } = next ?? {}

    const query = await this.permission.getListWorkspacesQuery(operatorId)

    const models = await getRepository(WorkspaceEntity).find({
      where: {
        ...query,
        createdAt: LessThan(new Date(timestamp)),
      },
      relations: ['members'],
      order: { createdAt: 'DESC' },
      take: limit,
    })
    const dtos = _(models)
      .map((m) => Workspace.fromEntity(m).toDTO(operatorId))
      .value()

    const { data: workspaces, next: nextNext } = loadMore(dtos, limit, (q) => q.createdAt)

    return {
      workspaces,
      next: nextNext,
    }
  }

  async create(operatorId: string, name: string, avatar?: string): Promise<WorkspaceDTO> {
    return getManager().transaction(this.isolationLevel, async (t) => {
      const model = await t.getRepository(WorkspaceEntity).save({
        name,
        avatar: avatar || '/api/static/avatars/workspace-default.png',
        inviteCode: this.generateInviteCode(),
      })

      const member = await t.getRepository(WorkspaceMemberEntity).save({
        workspaceId: model.id,
        userId: operatorId,
        role: PermissionWorkspaceRole.ADMIN,
        status: WorkspaceMemberStatus.ACTIVE,
        joinAt: new Date(),
      })

      // set relations
      model.members = [member]
      return Workspace.fromEntity(model).toDTO(operatorId)
    })
  }

  async join(
    workspaceId: string,
    userId: string,
    inviteCode: string,
    invitedById?: string,
  ): Promise<WorkspaceDTO> {
    const model = await this.mustFindOneWithMembers(workspaceId)
    if (model.inviteCode !== inviteCode) {
      throw InvalidArgumentError.new('invalid invite code')
    }

    return getManager().transaction(this.isolationLevel, async (t) => {
      const now = new Date()
      // update user status from creating to confirmed
      // TODO: add test cases
      await t
        .getRepository(UserEntity)
        .update({ id: userId, status: AccountStatus.CREATING }, { status: AccountStatus.CONFIRMED })
      let member = await t.getRepository(WorkspaceMemberEntity).findOne({ workspaceId, userId })
      if (!member) {
        member = getRepository(WorkspaceMemberEntity).create({
          workspaceId,
          userId,
          role: PermissionWorkspaceRole.MEMBER,
          status: WorkspaceMemberStatus.ACTIVE,
          invitedAt: now,
          joinAt: now,
          invitedById,
        })
      } else {
        member.status = WorkspaceMemberStatus.ACTIVE
        member.joinAt = now
      }

      const newMember = await t.getRepository(WorkspaceMemberEntity).save(member)

      model.members = _([...model.members, WorkspaceMember.fromEntity(newMember)])
        .uniqBy('userId')
        .value()

      return model.toDTO(userId)
    })
  }

  /**
   * if there is no user left in this workspace, delete this workspace
   */
  async leave(workspaceId: string, userId: string): Promise<void> {
    await getManager().transaction(this.isolationLevel, async (t) => {
      await t.getRepository(WorkspaceMemberEntity).delete({ workspaceId, userId })
      const workspace = await this.mustFindOneWithMembers(workspaceId, t)
      if (_.isEmpty(workspace.members)) {
        await t.getRepository(WorkspaceEntity).delete(workspaceId)
      }
    })
  }

  /**
   *
   * @returns linkPairs: key=> email, value=> inviteLink
   */
  async inviteMembers(
    operatorId: string,
    workspaceId: string,
    users: { email: string; role: PermissionWorkspaceRole }[],
  ): Promise<{ workspace: WorkspaceDTO; linkPairs: { [k: string]: string } }> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    const inviter = await userService.getById(operatorId)
    const emails = _(users).map('email').value()

    return getManager().transaction(this.isolationLevel, async (t) => {
      const userMap = await userService.createUserByEmailsIfNotExist(
        emails,
        t,
        AccountStatus.CREATING,
      )

      const entities = _(users)
        .map((user) =>
          getRepository(WorkspaceMemberEntity).create({
            workspaceId,
            userId: userMap[user.email].id,
            role: user.role,
            // NOTE: invited members join workspace automatically
            status: WorkspaceMemberStatus.ACTIVE,
            invitedAt: new Date(),
            invitedById: operatorId,
          }),
        )
        .value()

      await t
        .createQueryBuilder()
        .insert()
        .into(WorkspaceMemberEntity)
        .values(entities)
        .onConflict('DO NOTHING')
        .execute()

      const workspace = await this.mustFindOneWithMembers(workspaceId, t)

      const emailRes = await emailService.sendInvitationEmails(
        inviter.username,
        // FIXME: only send email to invited users
        _(_(userMap).values().value())
          .map((u) => ({ userId: u.id, email: u.email }))
          .value(),
        workspace.name,
      )

      return {
        workspace: workspace.toDTO(operatorId),
        linkPairs: _(emailRes).keyBy('email').mapValues('link').value(),
      }
    })
  }

  async kickoutMembers(
    operatorId: string,
    workspaceId: string,
    userIds: string[],
  ): Promise<WorkspaceDTO> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    if (_(userIds).includes(operatorId)) {
      throw InvalidArgumentError.new('cannot kickout your self')
    }

    await getRepository(WorkspaceMemberEntity).delete({
      workspaceId,
      userId: In(userIds),
    })
    const workspace = await this.mustFindOneWithMembers(workspaceId)

    return workspace.toDTO(operatorId)
  }

  async updateRole(
    operatorId: string,
    workspaceId: string,
    operateeId: string,
    role: PermissionWorkspaceRole,
  ): Promise<WorkspaceDTO> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    await getRepository(WorkspaceMemberEntity).update({ workspaceId, userId: operateeId }, { role })

    const workspace = await this.mustFindOneWithMembers(workspaceId)
    return workspace.toDTO(operatorId)
  }

  async syncWorkspaceView(operatorId: string, workspaceId: string): Promise<WorkspaceViewDTO> {
    await canGetWorkspaceData(this.permission, operatorId, workspaceId)

    let model = await getRepository(WorkspaceViewEntity).findOne({
      userId: operatorId,
      workspaceId,
    })
    if (!model) {
      model = await getRepository(WorkspaceViewEntity).save({
        userId: operatorId,
        workspaceId,
        pinnedList: [],
      })
    }

    return WorkspaceView.fromEntity(model).toDTO()
  }

  async getWorkspaceViewByViewId(operatorId: string, viewId: string): Promise<WorkspaceViewDTO> {
    const model = await getRepository(WorkspaceViewEntity).findOneOrFail(viewId)
    await canGetWorkspaceData(this.permission, operatorId, model!.workspaceId)

    return WorkspaceView.fromEntity(model!).toDTO()
  }

  private generateInviteCode() {
    return string2Hex(nanoid())
  }

  async updateWorkspacePreferences(
    operatorId: string,
    workspaceId: string,
    preferences: Record<string, unknown>,
  ): Promise<WorkspaceDTO> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    await getRepository(WorkspaceEntity).update(workspaceId, { preferences })
    const workspace = await this.mustFindOneWithMembers(workspaceId)
    return workspace.toDTO(operatorId)
  }

  private getInvitedMembers(users: User[], workspace: Workspace): User[] {
    return _(users)
      .filter(
        (u) =>
          _(workspace.members).find((m) => m.userId === u.id)?.status ===
          WorkspaceMemberStatus.INVITED,
      )
      .value()
  }
}

export class AnonymousWorkspaceService extends WorkspaceService {
  async leave(): Promise<void> {
    throw InvalidArgumentError.notSupport('leaving workspace')
  }

  async create(): Promise<WorkspaceDTO> {
    throw InvalidArgumentError.notSupport('creating workspace')
  }

  async inviteMembers(
    operatorId: string, // only for permission validation
    workspaceId: string,
    users: { email: string; role: PermissionWorkspaceRole }[],
  ): Promise<{ workspace: WorkspaceDTO; linkPairs: { [k: string]: string } }> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    const emails = _(users).map('email').value()

    const userMap = await userService.getByEmails(emails)
    return getManager().transaction(this.isolationLevel, async (t) => {
      const entities = _(users)
        .map((user) =>
          getRepository(WorkspaceMemberEntity).create({
            workspaceId,
            userId: userMap[user.email].id,
            role: user.role,
            // NOTE: invited members join workspace automatically
            status: WorkspaceMemberStatus.ACTIVE,
          }),
        )
        .value()

      await t
        .createQueryBuilder()
        .insert()
        .into(WorkspaceMemberEntity)
        .values(entities)
        .orIgnore()
        .execute()

      const workspace = await this.mustFindOneWithMembers(workspaceId, t)

      return {
        workspace: workspace.toDTO(),
        linkPairs: {},
      }
    })
  }
}

const service = isAnonymous()
  ? new AnonymousWorkspaceService(getIPermission())
  : new WorkspaceService(getIPermission())

export default service
