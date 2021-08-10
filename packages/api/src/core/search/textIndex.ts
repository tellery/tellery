import _ from 'lodash'
import { Brackets, getConnection, getRepository, SelectQueryBuilder } from 'typeorm'
import { getParticiple, getPostgreSQLConfig } from '../../clients/db/orm'

import BlockEntity from '../../entities/block'
import { UserEntity } from '../../entities/user'
import { BlockType } from '../../types/block'
import { highlight } from '../../utils/helper'
import { Block } from '../block'
import { User } from '../user'
import { HintData, ISearch, SearchFilter } from './interface'

/**
 * simple search, based on `to_tsvector`, `ts_query` and text index search of postgresql
 */
export class TextIndexSearch implements ISearch {
  private pattern = new RegExp("[`~!@#$^&*()=+|{}':;',\\[\\].<>/?~\\\\]", 'g')

  private participle: string

  constructor() {
    const cfg = getPostgreSQLConfig()
    this.participle = getParticiple(cfg)
  }

  async searchUsers(
    nameOrEmail: string,
    filter?: SearchFilter,
    skip = 0,
    limit = 20,
  ): Promise<HintData[]> {
    const executor = getRepository(UserEntity).createQueryBuilder('user').select('"user".*')
    if (filter) {
      executor.where(filter.query('user'), filter.parameters)
    }
    const filtered = this.filterBeforeReg(nameOrEmail).split(' ')
    executor
      .andWhere(
        new Brackets((qb) => {
          qb.where('user.username ~* :name', {
            name: filtered.join('.*'),
          }).orWhere('user.email ~* :email', {
            email: filtered.join('.*'),
          })
        }),
      )
      .orderBy('user.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)

    const models = (await executor.execute()) as UserEntity[]

    return _(models)
      .map((model): HintData => {
        const hint = User.fromEntity(model)
        return { hint, highlight: hint.username }
      })
      .value()
  }

  async searchBlocks(
    text: string,
    filter?: SearchFilter,
    skip = 0,
    limit = 20,
  ): Promise<HintData[]> {
    return this.searchBlocksInternal(text, filter, skip, limit)
  }

  searchBlocksBySql(
    text: string,
    filter?: SearchFilter,
    skip?: number,
    limit?: number,
  ): Promise<HintData[]> {
    return this.searchBlocksInternal(
      text,
      filter,
      skip,
      limit,
      `"content"->>'sql'`,
      (b) => _(b).get('content.sql') || '',
    )
  }

  async searchBlocksGroupByStoryId(
    text: string,
    filter?: SearchFilter,
    skip = 0,
    limit = 20,
  ): Promise<{ score?: number; storyId: string; blocks: { value: Block; highlight: string }[] }[]> {
    const searchableColumn = 'searchableText'
    let models: {
      id: string
      blocks: (BlockEntity & { score?: number })[]
      score?: number
      tokens?: string
    }[] = []
    const splitRegexp = this.filterBeforeReg(text).split(' ')

    // if text is empty, returns all the story blocks
    if (_.isEmpty(text)) {
      const executor = getRepository(BlockEntity).createQueryBuilder('block').select('block.*')
      if (filter) {
        executor.where(filter.query('block'), filter.parameters)
      }
      executor
        .andWhere('block.type = :type', { type: BlockType.STORY })
        .orderBy('block.updatedAt', 'DESC')

      const ms = (await executor.skip(skip).take(limit).execute()) as BlockEntity[]
      models = _(ms)
        .map((m) => ({ id: m.id, blocks: [] }))
        .value()
    } else {
      const executor = getConnection()
        .createQueryBuilder()
        .select('b.id', 'id')
        .addSelect('json_agg(search_res.*)', 'blocks')
        .addSelect('sum(search_res.score)', 'score')
        .addSelect(this.getAddTokensSelectQuery(), 'tokens')
        .from((subQuery) => {
          subQuery
            .select(this.getSearchSelectQuery(searchableColumn)('block'))
            .from(BlockEntity, 'block')
          if (filter) {
            subQuery.where(filter.query('block'), filter.parameters)
          }
          const regexpParams = this.convertToByteaStr(splitRegexp)
          // textsend_i is created by migration `TextSearchIndexing`
          subQuery
            .andWhere(
              new Brackets((qb) => {
                qb.where(this.getSearchFilterQuery(searchableColumn)('block')).orWhere(
                  `text(textsend_i(block.${searchableColumn})) ~* ${regexpParams.query}`,
                )
              }),
            )
            .setParameters({
              ...regexpParams.params,
              keyword: text,
            })
          return subQuery
        }, 'search_res')
        .leftJoin(BlockEntity, 'b', 'b.id = search_res."storyId"')
        .groupBy('b.id')
        .orderBy('score', 'DESC')

      models = await executor.skip(skip).take(limit).execute()
    }

    const hints = _(models)
      .map((bs) => ({
        storyId: bs.id,
        blocks: _(bs.blocks)
          .map((m) => {
            const value = Block.fromArgs(m)
            if (value) {
              return {
                value,
                highlight: this.handleHighlight(
                  m.score ? this.splitTokenStr(bs.tokens ?? '') : splitRegexp,
                  m.searchableText,
                ),
              }
            }
            return undefined
          })
          .compact()
          .value(),
        score: bs.score,
      }))
      .value()

    return hints
  }

  /**
   * Search for block based on fields in a specific database
   * @param searchableColumn Field for full-text search in the database
   * @param getSearchableValue Defines how to get plain text from block entities
   * @returns
   */
  private async searchBlocksInternal(
    text: string,
    filter?: SearchFilter,
    skip = 0,
    limit = 20,
    searchableColumn = 'searchableText',
    getSearchableValue = (b: BlockEntity) => b.searchableText,
  ): Promise<HintData[]> {
    let executor: SelectQueryBuilder<BlockEntity>
    const splitRegexps = this.filterBeforeReg(text).split(' ')
    // if text is empty, return all blocks
    if (_.isEmpty(text)) {
      executor = getRepository(BlockEntity)
        .createQueryBuilder('block')
        .select('block.*')
        .orderBy('block.updatedAt', 'DESC')
      if (filter) {
        executor.where(filter.query('block'), filter.parameters)
      }
    } else {
      executor = getRepository(BlockEntity)
        .createQueryBuilder('block')
        .select(this.getSearchSelectQuery(searchableColumn)('block'))
        .addSelect(this.getAddTokensSelectQuery(), 'tokens')
      if (filter) {
        executor.where(filter.query('block'), filter.parameters)
      }
      const regexpParams = this.convertToByteaStr(splitRegexps)
      executor
        .andWhere(
          new Brackets((qb) => {
            // textsend_i is created by migration `TextSearchIndexing`
            qb.where(this.getSearchFilterQuery(searchableColumn)('block')).orWhere(
              `text(textsend_i(block.${searchableColumn})) ~* ${regexpParams.query}`,
            )
          }),
        )
        .setParameters({
          keyword: text,
          ...regexpParams.params,
        })
        .orderBy('score', 'DESC')
    }

    const models = (await executor.skip(skip).take(limit).execute()) as (BlockEntity & {
      score?: number
    })[]

    return _(models)
      .map((m) => {
        const hint = Block.fromEntitySafely(m)
        if (!hint) {
          return
        }
        const score = _(m).get('score') || 0
        const tokens = _(m).get('tokens')

        return {
          hint,
          score,
          highlight: this.handleHighlight(
            score ? this.splitTokenStr(tokens) : splitRegexps,
            getSearchableValue(m),
          ),
        }
      })
      .compact()
      .value()
  }

  /**
   * @param column searched field
   * @returns All fields in block entity and scores for full-text search in searched field
   */
  private getSearchSelectQuery(column: string) {
    const tsQuery = `plainto_tsquery('${this.participle}', :keyword)`
    return (alias: string) =>
      `"${alias}".*, ts_rank_cd(to_tsvector('${this.participle}', ${alias}.${column}), ${tsQuery}) as score`
  }

  /**
   * @param column searched field
   * @returns search conditions
   */
  private getSearchFilterQuery(column: string) {
    return (alias: string) =>
      `to_tsvector('${this.participle}', ${alias}.${column}) @@ plainto_tsquery('${this.participle}', :keyword)`
  }

  // Get the result of word segmentation
  private getAddTokensSelectQuery() {
    return `to_tsvector('${this.participle}', :keyword)`
  }

  private filterBeforeReg(text: string): string {
    return _(text.replace(this.pattern, '').split(' ')).compact().join(' ')
  }

  /**
   *
   * @param tokens: 'key1':1 'key2':2
   * @param searchableText
   * @param highlightStr
   * @returns
   */
  private handleHighlight(tokens: string[], searchableText?: string): string {
    return highlight(searchableText ?? '', _(tokens).join(' '))
  }

  private splitTokenStr(token: string): string[] {
    return _(token)
      .split(' ')
      .map((t) => t.split(':')[0])
      .map((t) => _.trim(t, "'"))
      .compact()
      .value()
  }

  private convertToByteaStr(splits: string[]): { query: string; params: { [k: string]: string } } {
    const params = _(
      _.range(splits.length).map((idx) => {
        const value = splits[idx]
        return { key: `key${idx}`, value }
      }),
    )
      .keyBy('key')
      .mapValues('value')
      .value()
    const text = _(params)
      .keys()
      // textsend_i is created by migration `TextSearchIndexing`
      .map((s) => `ltrim(text(textsend_i(:${s})), '\\x')`)
      .join(`|| '.*' ||`)
    return { query: `text(${text})`, params }
  }
}
