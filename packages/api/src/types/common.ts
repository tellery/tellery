import { IsDefined } from 'class-validator'

export type JsonArray = Array<AnyJson>

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap

export interface JsonMap {
  [key: string]: AnyJson
}

export class LoadMoreKey {
  // FIXME: IsDefined not work
  @IsDefined()
  timestamp!: number

  limit?: number
}

export class SkipLoadMoreKey {
  @IsDefined()
  skip!: number

  limit?: number
}
