import { AuthData, AuthType } from './auth'
import { MetricSpec } from './metric'

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
  name: string
  type: string
  tokenizer: string
  metricSpec: MetricSpec
}

type Profile = {
  type: string
  name: string
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

enum ConnectionType {
  JDBC = 'jdbc',
}

type ConnectorDTO = {
  id: string
  url: string
  name: string
}

export {
  AvailableConfig,
  ProfileSpec,
  Profile,
  ConnectionType,
  Database,
  Collection,
  SqlQueryResult,
  ConnectorDTO,
  AddConnectorDTO,
  TypeField,
}
