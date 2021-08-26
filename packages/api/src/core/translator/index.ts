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
import * as explorationTranslator from './exploration'

const translators: ISqlTranslator[] = [sqlTranslator, dbtTranslator, explorationTranslator]

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

const rootKey = 'root'

type PartialQuery = {
  startIndex: number
  endIndex: number
  blockId: string
  alias: string
}

type SQLPieces = {
  subs: {
    blockId: string
    alias: string
  }[]
  mainBody: string
}

// Matching the form of {{ $blockId as $alias }} or {{ $blockId }}
const partialQueryPattern = new RegExp(
  `{{\\s*([a-zA-Z0-9-_]+)\\s*(?:as\\s+(\\w[\\w\\d]*))?\\s*}}`,
  'gi',
)

/**
 * Assist param to an executable statement
 */
async function translate(sql: string, opts: Record<string, unknown>): Promise<string> {
  const graph = await buildGraph(sql, opts)

  // check if the graph is valid
  if (graph.isCyclic(rootKey)) {
    throw CyclicTransclusionError.new()
  }

  return buildSqlFromGraph(graph)
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

export function buildSqlFromGraph(graph: DirectedGraph<SQLPieces, string>): string {
  const sqlMap: { [k: string]: string } = {}

  const root = graph.getNode(rootKey)
  if (_(root.subs).isEmpty()) {
    return root.mainBody
  }

  const stack = new Array<{ blockId: string; alias?: string }>()
  stack.push({ blockId: rootKey })

  while (stack.length !== 0) {
    const { blockId, alias } = stack.slice(-1)[0]

    let cteBody = ''
    let record = false
    const { subs, mainBody } = graph.getNode(blockId)
    if (subs.length === 0) {
      stack.pop()
      cteBody = mainBody
      record = true
    } else {
      let whole = true
      subs.forEach((s) => {
        if (!sqlMap[sqlMapKey(s.blockId, s.alias)]) {
          whole = false
          stack.push(s)
        }
      })

      if (whole) {
        stack.pop()
        record = true

        const commonTableExprs = _(subs)
          .map((s) => sqlMap[sqlMapKey(s.blockId, s.alias)])
          .value()
        // remove leading space and newlines, for further check
        const polishedMainBody = mainBody.trim()
        // compatible with `with recursive clause` in main body
        if (polishedMainBody.toLowerCase().startsWith('with recursive')) {
          cteBody = `WITH RECURSIVE \n${commonTableExprs.join(
            ',\n',
          )},\n${polishedMainBody.substring(15)}`
        } else {
          const commonTableExprBody = `WITH\n${commonTableExprs.join(',\n')}`
          // compatible with `with clause` in main body
          if (polishedMainBody.toLowerCase().startsWith('with ')) {
            cteBody = `${commonTableExprBody},\n${polishedMainBody.substring(5)}`
          } else {
            cteBody = `${commonTableExprBody}\n${polishedMainBody}`
          }
        }
      }
    }

    if (record) {
      sqlMap[sqlMapKey(blockId, alias)] = alias
        ? `  ${alias} AS (\n    ${cteBody.replace(/\n/g, '\n    ')}\n  )`
        : cteBody.replace(/\n/g, '\n    ')
    }
  }
  return sqlMap[sqlMapKey(rootKey)]
}

function extractPartialQueries(sql: string): PartialQuery[] {
  const matches = Array.from(sql.matchAll(partialQueryPattern))

  return _.map(matches, (match) => ({
    startIndex: match.index!,
    endIndex: match.index! + match[0].length,
    blockId: match[1],
    alias: match[2] ?? nanoid(),
  }))
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
    subs: _.map(partialQueries, (i) => _.pick(i, ['blockId', 'alias'])),
  }
}

function sqlMapKey(blockId: string, alias?: string): string {
  return `${blockId}${alias ?? ''}`
}

export { translate, sqlMacro, extractPartialQueries }
