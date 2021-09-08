import { AuthData, AuthType } from './auth'
import { QueryBuilderSpec } from './queryBuilder'

type Config = {
  name: string
  type: string // 'STRING' | 'NUMBER' | 'BOOLEAN'
  description?: string
  hint?: string
  required: boolean
  secret: boolean
  fillHint: boolean
}

type AvailableConfig = {
  type: string
  configs: Config[]
}

type ProfileSpec = {
  type: string
  tokenizer: string
  queryBuilderSpec: QueryBuilderSpec
}

type Profile = {
  id: string
  type: string
  configs: { [key: string]: string }
}

type Integration = {
  id: number
  profileId: string
  type: string
  configs: { [key: string]: string }
}

type SqlQueryResult = {
  fields: TypeField[]
  records: unknown[][]
  truncated: boolean
}

type TypeField = {
  name: string
  displayType: string
  sqlType: string
}

type AddConnectorDTO = {
  url: string
  authType: AuthType
  authData: AuthData
  name: string
}

type Database = string
type Collection = string

type ConnectorDTO = {
  id: string
  url: string
  name: string
}

export {
  AvailableConfig,
  ProfileSpec,
  Profile,
  Integration,
  Database,
  Collection,
  SqlQueryResult,
  ConnectorDTO,
  AddConnectorDTO,
  TypeField,
}
