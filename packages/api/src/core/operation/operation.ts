import _ from 'lodash'
import { EntityManager } from 'typeorm'

import { InvalidArgumentError } from '../../error/error'
import { OperationCmdType } from '../../types/operation'
import { Block } from '../block'
import { IPermission } from '../permission'
import { Snapshot } from '../snapshot'
import { WorkspaceView } from '../workspaceView'

/**
 * entity that can be operated by FEOP
 */
export type IOperationEntity = Block | WorkspaceView | Snapshot

/**
 * this interface need to be implemented by Block
 */
export interface IOperation {
  /**
   * get metadata by element id
   * @param id
   */
  entity(id: string): Promise<IOperationEntity>

  /**
   * find element in db by its id, if it does not exist, return undefined
   */
  findInDB(id: string): Promise<IOperationEntity | undefined>

  /**
   * override the property of an element
   * @param entity: object that operation applyed
   * @param args: the value to be override
   * @param path: the path of property being override, e.g. ["a","b", "c"] => a.b.
   */
  set(entity: IOperationEntity, args: any, path: string[]): Promise<IOperationEntity>

  /**
   * modify the property of an element
   * @param entity: object that operation applyed
   * @param args: the value to be modified
   * @param path: the path of property being modified, e.g. ["a","b", "c"] => a.b.
   */
  update(entity: IOperationEntity, args: any, path: string[]): Promise<IOperationEntity>

  /**
   * delete a property of an element
   * @param entity: object that operation applyed
   * @param operandId: the sub-element id to be deleted
   * @param path: the path of property being modified, e.g. ["a","b", "c"] => a.b.
   */
  remove(entity: IOperationEntity, operandId: string, path: string[]): Promise<IOperationEntity>

  /**
   * change the order
   * @param entity: object that operation applyed
   * @param operandId: the sub-element id
   * @param flag: denotes the element of operandId should be moved before or after the element of targetId
   * @param targetId: the element being compared, if targetId is null, operandId will be put in the beginning
   */
  updateIndex(
    entity: IOperationEntity,
    operateeId: string,
    path: string[],
    flag: 'before' | 'after',
    targetId?: string,
  ): Promise<IOperationEntity>

  save(entity: IOperationEntity, origin?: IOperationEntity): Promise<void>

  setPermissions(entity: IOperationEntity, args: any, path: string[]): Promise<IOperationEntity>

  /**
   * check if user is permitted to make modification
   * if not, the error must be thrown to rollback the database
   * @param entity: data after modification
   * @param origin: data before modification
   */
  checkPermission(
    ipv: IPermission,
    entity: IOperationEntity,
    origin?: IOperationEntity,
  ): Promise<void>
}

export abstract class DefaultOperation implements IOperation {
  protected operator: string

  protected workspaceId: string

  protected manager: EntityManager

  constructor(operator: string, workspaceId: string, manager: EntityManager) {
    this.operator = operator
    this.workspaceId = workspaceId
    this.manager = manager
  }

  entity(_id: string): Promise<IOperationEntity> {
    throw InvalidArgumentError.notSupport('entity')
  }

  async findInDB(_id: string): Promise<IOperationEntity | undefined> {
    // eslint-disable-next-line
    return
  }

  set(_entity: IOperationEntity, _args: any, _path: string[]): Promise<IOperationEntity> {
    throw InvalidArgumentError.notSupport('set')
  }

  update(_entity: IOperationEntity, _args: any, _path: string[]): Promise<IOperationEntity> {
    throw InvalidArgumentError.notSupport('update')
  }

  setPermissions(
    _entity: IOperationEntity,
    _args: any,
    _path: string[],
  ): Promise<IOperationEntity> {
    throw InvalidArgumentError.notSupport('setPermissions')
  }

  remove(_entity: IOperationEntity, _args: any, _path: string[]): Promise<IOperationEntity> {
    throw InvalidArgumentError.notSupport('remove')
  }

  updateIndex(
    _entity: IOperationEntity,
    _operateeId: string,
    _path: string[],
    _flag: 'before' | 'after',
    _targetId?: string,
  ): Promise<IOperationEntity> {
    throw InvalidArgumentError.notSupport('updateIndex')
  }

  save(_entity: IOperationEntity, _origin?: IOperationEntity): Promise<void> {
    throw InvalidArgumentError.notSupport('save')
  }

  async checkPermission(
    _ipv: IPermission,
    _entity: IOperationEntity,
    _origin?: IOperationEntity,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): Promise<void> {}

  protected async updateIndexHelper(
    entity: IOperationEntity,
    operateeId: string,
    path: string[],
    flag: 'before' | 'after',
    targetId?: string,
  ) {
    let position = !targetId && flag === 'before' ? 0 : -1
    const val = this.getStringArray(entity, path) ?? []

    if (targetId) {
      position = _(val).indexOf(targetId!)
      if (flag === 'after') {
        position++
      }
    }
    _(entity).get(path)?.splice(position, 0, operateeId)
    const array = this.getStringArray(entity, path)
    if (!_(array).isEmpty() && _.uniq(array).length !== array!.length) {
      throw new InvalidArgumentError(`the <${path}> of ${entity} has duplicate values`)
    }
    return entity
  }

  protected isBeingDeleted(query: IOperationEntity, origin: { alive: boolean }) {
    return origin.alive && this.isAliveEqual(query, false)
  }

  protected isBeingReverted(query: IOperationEntity, origin: { alive: boolean }) {
    return !origin.alive && this.isAliveEqual(query, true)
  }

  private isAliveEqual(query: IOperationEntity, target: boolean): boolean {
    return _(query).get('alive') === target
  }

  protected getId(query: IOperationEntity): string {
    return _(query).get('id')
  }

  protected getKeyByPath(path: string[]): string {
    return _(path).compact().join('.')
  }

  protected getStringArray(entity: IOperationEntity, path: string[]): string[] | undefined {
    return _(entity).get(path)
  }

  protected isObjOrMap(args: any): boolean {
    return _.isMap(args) || (!_.isArray(args) && _.isObject(args))
  }
}

export type OperationConstructor = new (
  id: string,
  path: string[],
  args: any,
  operation: IOperation,
) => Operation

export abstract class Operation {
  static cmd: OperationCmdType

  // operand id
  id: string

  // the path of operated property of operand
  path: string[]

  // argument of operation
  args: any

  operation: IOperation

  constructor(id: string, path: string[], args: any, operation: IOperation) {
    this.id = id
    this.path = path
    this.args = args
    this.operation = operation
  }

  abstract apply(entity: IOperationEntity): Promise<IOperationEntity>
}
