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
  searchUsers(
    username: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]>
  searchBlocks(
    text: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]>
  searchBlocksByTitle(
    text: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]>
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
  // internal: this will only search question block's title
  _QUESTION_BLOCK_TITLE = '_question_title',
}

export interface SearchFilter {
  query: (tableName?: string) => string
  parameters: { [k: string]: any }
}
