import { Block } from '../block'
import { Entity } from '../common'
import { User } from '../user'
import { TextIndexSearch } from './textIndex'

export function getISearch() {
  return new TextIndexSearch()
}

/**
 * Search interface
 * @param filter
 * @param resources: all by default
 *
 */
export interface ISearch {
  /**
   * Search users by keyword
   */
  searchUsers(
    keyword: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]>
  /**
   * Search according to `block.searchableText`
   */
  searchBlocks(
    text: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]>
  /**
   * Search according to `block.content.sql`
   */
  searchBlocksBySql(
    text: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]>
  /**
   * Search all blocks in Story by keyword and aggregate the results by storyId
   */
  searchBlocksGroupByStoryId(
    text: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<{ score?: number; storyId: string; blocks: { value: Block; highlight: string }[] }[]>
}

/**
 * resulting data
 */
export type SearchData = {
  hints: (HintData & {
    type: SearchableResourceType
    highlight: string
  })[]
}

export type HintData = {
  /**
   * resulting entity
   */
  hint: Entity | User

  /**
   * highlighted text
   */
  highlight: string

  score?: number
}

export enum SearchableResourceType {
  BLOCK = 'block',
  USER = 'user',
  // internal: this will only search question block's sql
  _SQL = '_sql',
}

export interface SearchFilter {
  /**
   * @param tableName: name of the table currently executing query
   * @return: the filter statement in the sql that can be recognized by typeorm
   * e.g.
   * query("block") => `1=1 AND "block"."blockId"=:blockId`
   */
  query: (tableName?: string) => string
  /**
   * type: ObjectLiteral
   * parameters in typeorm QueryBuilder
   */
  parameters: { [k: string]: any }
}
