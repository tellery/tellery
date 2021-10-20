import { plainToClass, Type } from 'class-transformer'
import { IsArray, IsDefined, IsEnum, ValidateNested } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import { isEmpty } from 'lodash'

import { getOperationService } from '../services/operation'
import { OperationCmdType, OperationTableType } from '../types/operation'
import { validate } from '../utils/http'
import { mustGetUser } from '../utils/user'

class FEOPRequest {
  @IsDefined()
  @IsEnum(OperationCmdType)
  cmd!: OperationCmdType // operation type

  @IsDefined()
  id!: string // operand id

  @IsArray()
  @Type(() => String)
  path!: string[] // prop path of operand

  @IsEnum(OperationTableType)
  table!: OperationTableType // table of operand

  @IsDefined()
  args!: any // args of operation
}

class TransactionRequest {
  @IsDefined()
  id!: string

  @IsDefined()
  workspaceId!: string

  /**
   * feop operation list
   */
  @IsArray()
  @Type(() => FEOPRequest)
  @ValidateNested()
  operations!: FEOPRequest[]
}

class SaveTransactionsRequest {
  // TODO: add record fields

  /**
   * operation of a page made by user, for each transaction, either succeeded or failed as a whole
   */
  @IsArray()
  @Type(() => TransactionRequest)
  @ValidateNested()
  transactions!: TransactionRequest[]
}

async function saveTransactions(ctx: Context) {
  const payload = plainToClass(SaveTransactionsRequest, ctx.request.body)
  await validate(ctx, payload)

  const user = mustGetUser(ctx)

  const failures = await getOperationService().saveTransactions(user.id, payload.transactions)

  if (!isEmpty(failures)) {
    throw failures[0].error
  }
  ctx.body = { success: true }
}

const router = new Router()

router.post('/saveTransactions', saveTransactions)

export default router
