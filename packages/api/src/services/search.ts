/* eslint-disable no-case-declarations */
import _ from 'lodash'
import { getRepository, In } from 'typeorm'

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
    const blockPermissionFilter = await this.permission.getSearchBlocksQuery(
      operatorId,
      workspaceId,
    )
    const getFiltersBySearchResourceType = async (
      type: SearchableResourceType,
    ): Promise<SearchFilter> => {
      let query: SearchFilter
      switch (type) {
        case SearchableResourceType.BLOCK || SearchableResourceType._SQL:
          query = mergeSearchFilters([
            blockPermissionFilter,
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
    const rawBlockMap = getResultMap(SearchableResourceType.BLOCK)
    const sids = _(rawBlockMap).values().map('storyId').uniq().value() as string[]

    // check permission again, since loaded blocks with permission may belong to a story with no permission
    const stories = await getRepository(BlockEntity)
      .createQueryBuilder('block')
      .where(blockPermissionFilter.query('block'), blockPermissionFilter.parameters)
      .andWhere({ id: In(sids) })
      .getMany()

    const loadedSids = _(stories).map('id').value()

    const blockMap = _.pickBy(rawBlockMap, (val) => loadedSids.includes(val.storyId))

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
