import _ from 'lodash'
import { getRepository, In } from 'typeorm'

import BlockEntity from '../../entities/block'
import { WorkspaceEntity } from '../../entities/workspace'
import { WorkspaceMemberEntity } from '../../entities/workspaceMember'
import { NotFoundError } from '../../error/error'
import {
  PermissionEntityAction,
  PermissionEntityRoleType,
  PermissionWorkspaceAction,
} from '../../types/permission'
import { isTest } from '../../utils/env'
import { SearchFilter } from '../search/interface'
import { getPermissionEntityActionsByRole, getRoleInStory } from './entity'
import { getPermissionWorkspaceActionsByRole, getRoleInWorkspace } from './workspace'

export enum PermissionResourceType {
  Workspace = 'workspace',
  Group = 'group',
  Block = 'block',
}

export function getIPermission() {
  if (isTest()) {
    return new FakePermission()
  }
  return new Permission()
}

export type Action = PermissionWorkspaceAction | PermissionEntityAction

export interface IPermission {
  /**
   * being able to get the content of a workspace
   */
  canGetWorkspaceData(operatorId: string, workspace: string | WorkspaceEntity): Promise<boolean>

  /**
   * being able to modify the content of a workspace
   */
  canUpdateWorkspaceData(operatorId: string, workspace: string | WorkspaceEntity): Promise<boolean>

  /**
   * being able to get the content of a block
   */
  canGetBlockData(operatorId: string, block: string | BlockEntity): Promise<boolean>

  /**
   * being able to modify the content of a block
   */
  canUpdateBlockData(operatorId: string, block: string | BlockEntity): Promise<boolean>

  /**
   * get the filter of searching blocks
   */
  getSearchBlocksQuery(operatorId: string, workspaceId: string): Promise<SearchFilter>

  /**
   * get the filter of searching users
   */
  getSearchUsersQuery(operatorId: string, workspaceId: string): Promise<SearchFilter>

  /**
   * get the filter of listing workspaces
   */
  getListWorkspacesQuery(operatorId: string): Promise<{ [k: string]: any }>
}

export class FakePermission implements IPermission {
  async canGetWorkspaceData(): Promise<boolean> {
    return true
  }

  async canUpdateWorkspaceData(): Promise<boolean> {
    return true
  }

  async canGetBlockData(): Promise<boolean> {
    return true
  }

  async canUpdateBlockData(): Promise<boolean> {
    return true
  }

  async getSearchBlocksQuery(): Promise<SearchFilter> {
    return { query: () => '1=1', parameters: {} }
  }

  async getSearchUsersQuery(): Promise<SearchFilter> {
    return { query: () => '1=1', parameters: {} }
  }

  async getListWorkspacesQuery(): Promise<{ [k: string]: any }> {
    return {}
  }
}

// TODO: add cache
export class Permission implements IPermission {
  async canGetWorkspaceData(
    operatorId: string,
    workspace: string | WorkspaceEntity,
  ): Promise<boolean> {
    const w = await this.mustGetWorkspace(workspace)
    const role = getRoleInWorkspace(operatorId, w)
    return role
      ? getPermissionWorkspaceActionsByRole(role).includes(
          PermissionWorkspaceAction.GET_WORKSPACE_DATA,
        )
      : false
  }

  async canUpdateWorkspaceData(
    operatorId: string,
    workspace: string | WorkspaceEntity,
  ): Promise<boolean> {
    const w = await this.mustGetWorkspace(workspace)
    const role = getRoleInWorkspace(operatorId, w)
    return role
      ? getPermissionWorkspaceActionsByRole(role).includes(
          PermissionWorkspaceAction.MANAGE_WORKSPACE,
        )
      : false
  }

  async canGetBlockData(operatorId: string, block: string | BlockEntity): Promise<boolean> {
    const b = await this.mustGetBlock(block)
    const role = getRoleInStory(operatorId, b)
    return role
      ? getPermissionEntityActionsByRole(role).includes(PermissionEntityAction.VIEW)
      : false
  }

  async canUpdateBlockData(operatorId: string, block: string | BlockEntity): Promise<boolean> {
    const b = await this.mustGetBlock(block)
    const role = getRoleInStory(operatorId, b)
    return role
      ? getPermissionEntityActionsByRole(role).includes(PermissionEntityAction.EDIT)
      : false
  }

  async getSearchBlocksQuery(operatorId: string, workspaceId: string): Promise<SearchFilter> {
    await this.canGetWorkspaceData(operatorId, workspaceId)
    return {
      query: (t) =>
        `${t}.workspaceId = :workspaceId AND ( ${t}.permissions @> '[{ "type" : "${PermissionEntityRoleType.WORKSPACE}" }]' OR ${t}.permissions @> '[{ "id" : "${operatorId}" }]' )`,
      parameters: {
        workspaceId,
      },
    }
  }

  async getSearchUsersQuery(operatorId: string, workspaceId: string): Promise<SearchFilter> {
    const workspace = await this.mustGetWorkspace(workspaceId)
    await this.canGetWorkspaceData(operatorId, workspace)

    const users = _(workspace?.members).map('userId').uniq().value()
    return {
      query: (t) => `${t}.id IN(:...ids)`,
      parameters: {
        ids: users,
      },
    }
  }

  private async mustGetWorkspace(workspace: WorkspaceEntity | string): Promise<WorkspaceEntity> {
    let model: WorkspaceEntity
    if (_(workspace).isString()) {
      model = await getRepository(WorkspaceEntity).findOneOrFail(workspace as string, {
        relations: ['members'],
        cache: true,
      })
    } else {
      model = workspace as WorkspaceEntity
    }
    return model
  }

  private async mustGetBlock(block: BlockEntity | string): Promise<BlockEntity> {
    let model: BlockEntity
    if (_(block).isString()) {
      model = await getRepository(BlockEntity).findOneOrFail(block as string, {
        cache: true,
      })
    } else if (_(block).isObject()) {
      model = block as BlockEntity
    } else {
      throw NotFoundError.resourceNotFound(block.toString())
    }
    return model
  }

  async getListWorkspacesQuery(operatorId: string): Promise<{ [k: string]: any }> {
    const ids = _(
      await getRepository(WorkspaceMemberEntity).find({
        select: ['workspaceId'],
        where: {
          userId: operatorId,
        },
      }),
    )
      .map('workspaceId')
      .value()
    return {
      id: In(ids),
    }
  }
}
