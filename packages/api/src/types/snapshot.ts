import { SqlQueryResult } from './connector'

export type SnapshotDTO = {
  id: string
  questionId: string
  sql: string
  data: SqlQueryResult
  alive: boolean
  version: number
  createdById?: string
  lastEditedById?: string
  createdAt: number
  updatedAt: number
}
