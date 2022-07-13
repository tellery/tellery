import _ from 'lodash'
import bluebird from 'bluebird'
import { getRepository, In } from 'typeorm'
import { customAlphabet } from 'nanoid'

import BlockEntity from '../../entities/block'
import { CyclicTransclusionError, InvalidArgumentError, NotFoundError } from '../../error/error'
import { DirectedGraph } from '../../utils/directedgraph'
import { Block } from '../block'
import { ISqlTranslator } from './interface'

import * as dbtTranslator from './dbt'
import * as sqlTranslator from './sql'
import * as smartQueryTranslator from './smartQuery'
import * as mustacheParser from '@tellery/mustache-parser'
const translators: ISqlTranslator[] = [sqlTranslator, dbtTranslator, smartQueryTranslator]
const VARIABLE_REGEX = /\{\{([a-z|A-Z|0-9|_|-]{0,20})\}\}/g
// {{start}}
// {{blockId(start=start,end='2021-22')}}
// {{blockId(start=start,end=end)}}
// {{blockId(name=name) as $alias}}
// Matcher of the form {{ $blockId as $alias }} or {{ $blockId }} or {{ $blockId | name=value, name2=value2 }} or {{ $blockId | name=$var, name2=$var2 }} or {{ $blockId | name={var}, name2={var2} }} or {{ $blockId as $alias | name=value, name2=value2 }}
// const partialQueryPattern = /{{\s*([a-zA-Z0-9-_]+)\s*(?:as\s+(\w[\w\d]*))?\s*}}/gi
const mustachePattern = /{{\s*(.+?)\s*}}/g
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

const rootKey = 'root'

type PartialQuery = {
  startIndex: number
  endIndex: number
  blockId: string
  alias: string
  params?: Record<string, string>
}

type PartialExpression = {
  startIndex: number
  endIndex: number
  name: string
  alias: string
  type: 'transclusion' | 'variable'
  params?: Record<string, string>
}

type SQLPieces = {
  subs: {
    alias: string
    params?: Record<string, string>
    blockId: string
  }[]
  mainBody: string
}

function withLimit(sql: string, limit: number): string {
  const singleLinedSql = sql.replace(/\n/g, ' ')
  // TODO: replace this regex by a proper parser
  const sqlType =
    singleLinedSql
      .match(/^(?:with.+\)\s+)?(select|update|delete|insert|desc|create|alter|drop|grant)/i)?.[1]
      ?.toLowerCase() ?? 'unknown'

  // if sql is not a select clause or it has been limited already, return
  if (sqlType !== 'select' || singleLinedSql.match(/limit \d+\s*$/i) !== null) {
    return sql
  }
  return `${sql}\nLIMIT ${limit}`
}

/**
 * Assist param to an executable statement
 */
async function translate(
  sql: string,
  opts: Record<string, unknown>,
  limit = 1000,
): Promise<string> {
  const graph = await buildGraph(sql, opts)

  // check if the graph is valid
  if (graph.isCyclic(rootKey)) {
    throw CyclicTransclusionError.new()
  }

  return withLimit(buildSqlFromGraph(graph), limit)
}

/**
 * @returns key: blockId, value: sql
 */
async function loadSqlFromBlocks(
  blockIds: string[],
  opts: Record<string, unknown> = {},
): Promise<{ [k: string]: string }> {
  if (_.isEmpty(blockIds)) {
    return {}
  }
  const records = _(
    await getRepository(BlockEntity).find({
      id: In(blockIds),
      alive: true,
    }),
  )
    .map((r) => Block.fromEntitySafely(r))
    .compact()
    .value()

  // validate the integrity of blocks
  const missingBlocks = _.xor(_(records).map('id').value(), blockIds)
  if (!_.isEmpty(missingBlocks)) {
    throw NotFoundError.resourceNotFound(missingBlocks.toString())
  }

  return bluebird.props(
    _(records)
      .keyBy('id')
      .mapValues(async (b) => {
        // eslint-disable-next-line no-restricted-syntax
        for (const translator of translators) {
          if (translator.match(b)) {
            return translator.translate(b, opts)
          }
        }
        throw InvalidArgumentError.new(`cannot find sql translator for block: ${b.id}`)
      })
      .value(),
  )
}

async function buildGraph(
  sql: string,
  opts: Record<string, unknown> = {},
): Promise<DirectedGraph<SQLPieces, string>> {
  const res = new DirectedGraph<SQLPieces>()
  const root = sqlMacro(sql)
  const queue = new Array<{ key: string; node: SQLPieces }>()
  queue.push({ key: rootKey, node: root })

  while (queue.length !== 0) {
    const { key, node } = queue.shift()!
    res.addNode(key, node)

    const bids = _(node.subs).map('blockId').value()

    // add edges
    bids.forEach((bid) => res.addEdge(key, bid))

    const notIncludedBlockIds = _(bids)
      .filter((bid) => !res.hasNode(bid))
      .value()

    // eslint-disable-next-line no-await-in-loop
    const notIncludedSqls = await loadSqlFromBlocks(notIncludedBlockIds, opts)

    _(notIncludedSqls).forEach((s, currKey) => queue.push({ key: currKey, node: sqlMacro(s) }))
  }
  return res
}

const replaceSqlVariables = (data: string, params: Record<string, string> = {}): string => {
  const result = data.replace(VARIABLE_REGEX, (name) => {
    const variableName = name.slice(2, -2)
    const value = params[variableName]
    if (!value) {
      throw new Error('variable not found')
    }
    if (value.startsWith('"')) {
      return value.slice(1, -1) ?? ''
    } else {
      return `{{${value ?? ''}}}`
    }
  })
  return result
}

const getCTEBody = (mainBody: string, commonTableExprs: string[]) => {
  if (commonTableExprs.length === 0) return mainBody
  // remove leading space and newlines, for further check
  const polishedMainBody = mainBody.trim()
  // compatible with `with recursive clause` in main body
  if (polishedMainBody.toLowerCase().startsWith('with recursive')) {
    return `WITH RECURSIVE \n${commonTableExprs.join(',\n')},\n${polishedMainBody.substring(15)}`
  } else {
    const commonTableExprBody = `WITH\n${commonTableExprs.join(',\n')}`
    // compatible with `with clause` in main body
    if (polishedMainBody.toLowerCase().startsWith('with ')) {
      return `${commonTableExprBody},\n${polishedMainBody.substring(5)}`
    } else {
      return `${commonTableExprBody}\n${polishedMainBody}`
    }
  }
}

const getParamsWithContext = (
  params: Record<string, string> = {},
  context: Record<string, string> = {},
) => {
  const newParams: Record<string, string> = {}
  for (const key in params) {
    const value = params[key]
    if (value.startsWith('"')) {
      // literal expression
      newParams[key] = value
    } else {
      // replace with context params
      newParams[key] = context[value]
    }
  }
  return newParams
}

export function buildSqlFromGraph(graph: DirectedGraph<SQLPieces, string>): string {
  const sqlMap: { [k: string]: string } = {}

  const root = graph.getNode(rootKey)
  if (_(root.subs).isEmpty()) {
    return root.mainBody
  }

  const stack = new Array<Pick<PartialQuery, 'alias' | 'blockId' | 'params'>>()
  stack.push({ blockId: rootKey, alias: '', params: {} })
  while (stack.length !== 0) {
    const { blockId, alias, params } = stack.slice(-1)[0]
    const { subs, mainBody } = graph.getNode(blockId)

    let isComplete = true
    subs.forEach((s) => {
      if (!sqlMap[sqlMapKey(s.blockId, s.alias)]) {
        isComplete = false

        stack.push({
          ...s,
          blockId: s.blockId,
          params: getParamsWithContext(s.params, params),
        })
      }
    })

    if (!isComplete) {
      continue
    }

    let cteBody = ''
    stack.pop()

    const commonTableExprs = _(subs)
      .map((s) =>
        replaceSqlVariables(
          sqlMap[sqlMapKey(s.blockId, s.alias)],
          getParamsWithContext(s.params, params),
        ),
      )
      .value()
    cteBody = getCTEBody(replaceSqlVariables(mainBody, params), commonTableExprs)

    const result = alias
      ? `  ${alias} AS (\n    ${cteBody.replace(/\n/g, '\n    ')}\n  )`
      : cteBody.replace(/\n/g, '\n    ')

    sqlMap[sqlMapKey(blockId, alias)] = result
  }
  // console.log(sqlMap)
  return sqlMap[sqlMapKey(rootKey)]
}

function extractPartialQueries(sql: string): PartialQuery[] {
  const expressions = extractExpressions(sql)

  return (
    expressions
      // block id len is 21
      .filter((expression) => expression.type === 'transclusion')
      .map((expression) => ({
        ...expression,
        blockId: expression.name,
      }))
  )
}

function extractExpressions(sql: string): PartialExpression[] {
  const matches = Array.from(sql.matchAll(mustachePattern))

  return _.map(matches, (match) => {
    const matchText = match[1]
    try {
      const result = mustacheParser.parse(matchText, {})
      return {
        startIndex: match.index!,
        endIndex: match.index! + match[0].length,
        name: result.name,
        type: result.name.length === 21 ? 'transclusion' : 'variable',
        params: result.params,
        alias: result.alias ?? nanoid(),
      }
    } catch (err) {
      console.error(err, sql)
      return null
    }
  }).filter((item) => !!item) as PartialExpression[]
}

/*
  Extract and structure all customized reference part
*/
function sqlMacro(sql: string): SQLPieces {
  const partialQueries = extractPartialQueries(sql)

  const mainBody = _.zip(
    [{ endIndex: 0 }, ...partialQueries],
    [...partialQueries, { startIndex: sql.length, alias: '' }],
  )
    .map(([i, j]) => ({
      start: i!.endIndex,
      end: j!.startIndex,
      alias: j!.alias,
    }))
    .map(({ start, end, alias }) => sql.substring(start, end) + alias)
    .join('')

  return {
    mainBody,
    subs: _.map(partialQueries, (i) => _.pick(i, ['blockId', 'alias', 'params'])),
  }
}

function sqlMapKey(blockId: string, alias?: string): string {
  return `${blockId}${alias ?? ''}`
}

export { translate, sqlMacro, extractPartialQueries }
