import bluebird from 'bluebird'
import _ from 'lodash'

import { highlight } from '../../utils/helper'
import { Block } from '../block'
import { Entity } from '../common'
import { User } from '../user'
import { ISearch, SearchableResourceType, SearchData } from './interface'

/**
 * search blocks then aggregated by story
 */
export async function searchBlocksGroupByStory(
  iSearch: ISearch,
  text: string,
  filters?: { query: (tableName?: string) => string; parameters: { [k: string]: any } },
  limit = 20,
  skip = 0,
): Promise<{ storyId: string; blocks: { value: Block; highlight: string }[]; score?: number }[]> {
  return iSearch.searchBlocksGroupByStoryId(text, filters, skip, limit)
}

export async function search(
  iSearch: ISearch,
  text: string,
  getFiltersByType?: (
    type: SearchableResourceType,
  ) => Promise<
    { query: (tableName?: string) => string; parameters: { [k: string]: any } } | undefined
  >,
  resources?: SearchableResourceType[],
  limit = 20,
  skip = 0,
): Promise<SearchData> {
  if (_(resources).isEmpty()) {
    return { hints: [] }
  }

  const types = resources!

  const hintList = _(
    await bluebird.map(types, async (t) => {
      switch (t) {
        case SearchableResourceType.BLOCK:
          return iSearch.searchBlocks(
            text,
            getFiltersByType ? await getFiltersByType(SearchableResourceType.BLOCK) : undefined,
            skip,
            limit,
          )
        case SearchableResourceType.USER:
          // no need for cutting words when searching users
          return iSearch.searchUsers(
            text,
            getFiltersByType ? await getFiltersByType(SearchableResourceType.USER) : undefined,
            skip,
            limit,
          )
        case SearchableResourceType._QUESTION_BLOCK_SQL:
          return iSearch.searchBlocksBySql(
            text,
            getFiltersByType ? await getFiltersByType(SearchableResourceType.BLOCK) : undefined,
            skip,
            limit,
          )
        default:
          return []
      }
    }),
  )
    .map()
    .value()

  const hints = _(hintList)
    .flatMap()
    .orderBy(['score'], ['desc'])
    .slice(0, limit)
    .map((ele) => ({
      ...ele,
      // eslint-disable-next-line
      type: isEntity(ele.hint) ? SearchableResourceType.BLOCK : SearchableResourceType.USER,
      highlight: getHighlight(ele.hint, text),
    }))
    .value()
  return {
    hints,
  }
}

function getHighlight(value: Entity | User, text: string): string {
  if (isEntity(value)) {
    return highlight((value as Entity).getPlainText() ?? '', text)
  }

  const user = value as User
  return `${user.username}`
}

function isEntity(input: any): boolean {
  return !!input.getEntityType
}
