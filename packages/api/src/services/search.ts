/* eslint-disable no-case-declarations */
import _ from 'lodash'
import { getRepository } from 'typeorm'

import { Block } from '../core/block'
import { getIPermission, IPermission } from '../core/permission'
import { search as coreSearch } from '../core/search'
import { getISearch, ISearch, SearchableResourceType, SearchFilter } from '../core/search/interface'
import BlockEntity from '../entities/block'
import { BlockDTO } from '../types/block'
import { SearchDataDTO } from '../types/search'
import { UserInfoDTO } from '../types/user'
import { mergeSearchFilters } from '../utils/common'

export class SearchService {
  private permission: IPermission

  private search: ISearch

  private readonly allowedSearchFilters = ['type']

  constructor(p: IPermission, s: ISearch) {
    this.permission = p
    this.search = s
  }

  async searchResources(
    operatorId: string,
    workspaceId: string,
    keyword: string,
    typeList?: SearchableResourceType[],
    limit = 20,
    requestFilters?: { [k: string]: any },
  ): Promise<SearchDataDTO> {
    const types = _(typeList).isEmpty() ? Object.values(SearchableResourceType) : typeList!
    const getFiltersBySearchResourceType = async (
      type: SearchableResourceType,
    ): Promise<SearchFilter> => {
      let query: SearchFilter
      switch (type) {
        case SearchableResourceType.BLOCK || SearchableResourceType._SQL:
          const permissionFilter = await this.permission.getSearchBlocksQuery(
            operatorId,
            workspaceId,
          )
          query = mergeSearchFilters([
            permissionFilter,
            {
              query: (t?: string) => `${t!}.alive = :alive`,
              parameters: {
                alive: true,
              },
            },
          ])
          break
        case SearchableResourceType.USER:
          query = await this.permission.getSearchUsersQuery(operatorId, workspaceId)
          break
      }
      const sr = this.requestFiltersToSearchFilter(requestFilters)
      return mergeSearchFilters(_([sr, query!]).compact().value())
    }
    const res = await coreSearch(this.search, keyword, getFiltersBySearchResourceType, types, limit)
    const { hints } = res

    const getResultMap = (
      type: SearchableResourceType,
    ): { [k: string]: BlockDTO | UserInfoDTO | any } =>
      _(hints)
        .filter((h) => h.type === type)
        .map('hint')
        .keyBy('id')
        .mapValues((h) => h.toDTO())
        .value()

    // pad story blocks
    const blockMap = getResultMap(SearchableResourceType.BLOCK)
    const sids = _(blockMap).values().map('storyId').uniq().value() as string[]

    // here no need for checking permission, cuz user must be privileged
    const stories = await getRepository(BlockEntity).findByIds(sids)
    _(stories)
      .map((e) => Block.fromEntity(e).toDTO())
      .forEach((r) => {
        blockMap[r.id] = r
      })

    return {
      results: {
        blocks: blockMap,
        users: getResultMap(SearchableResourceType.USER),
        highlights: _(res.hints)
          .keyBy((v) => _(v.hint).get('id'))
          .mapValues('highlight')
          .value(),
        searchResults: _(res.hints).map('hint').map('id').value(),
      },
    }
  }

  private requestFiltersToSearchFilter(filter?: { [key: string]: any }): SearchFilter | undefined {
    if (!filter) {
      return
    }
    // only allow exact match
    return {
      query: (t) =>
        _(filter)
          .keys()
          // limit fields
          .filter((f) => _(this.allowedSearchFilters).includes(f))
          .map((f) => `${t!}.${f} = :${f}`)
          .join(' AND '),
      parameters: filter,
    }
  }
}

const service = new SearchService(getIPermission(), getISearch())
export default service
