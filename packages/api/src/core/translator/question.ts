import _ from 'lodash'
import { getRepository, In } from 'typeorm'
import { customAlphabet } from 'nanoid'

import BlockEntity from '../../entities/block'
import { CyclicTransclusionError, NotFoundError } from '../../error/error'
import { BlockType } from '../../types/block'
import { DirectedGraph } from '../../utils/directedgraph'
import { QuestionBlock } from '../block/question'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

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
 * This is the default translator, its matching priority is the lowest. It will match all that is not matched by other Translator
 */
function match(): boolean {
  return true
}

/**
 * Assist param to an executable statement
 */
async function translate(sql: string): Promise<string> {
  const graph = await buildGraph(sql)

  // check if the graph is valid
  if (graph.isCyclic('root')) {
    throw CyclicTransclusionError.new()
  }

  return buildSqlFromGraph('root', graph)
}

/**
 * @returns key: blockId, value: sql
 */
async function loadSqlFromBlocks(blockIds: string[]): Promise<{ [k: string]: string }> {
  if (_.isEmpty(blockIds)) {
    return {}
  }
  const records = await getRepository(BlockEntity).find({
    id: In(blockIds),
    alive: true,
    type: BlockType.QUESTION,
  })

  // validate the integrity of blocks
  if (records.length !== blockIds.length) {
    throw NotFoundError.resourceNotFound(_.xor(_(records).map('id').value(), blockIds).toString())
  }

  return _(records)
    .map((r) => QuestionBlock.fromEntity(r) as QuestionBlock)
    .keyBy('id')
    .mapValues((b) => b.getSql())
    .value()
}

async function buildGraph(sql: string): Promise<DirectedGraph<SQLPieces, string>> {
  const res = new DirectedGraph<SQLPieces>()
  const root = sqlMacro(sql)
  const queue = new Array<{ key: string; node: SQLPieces }>()
  queue.push({ key: 'root', node: root })

  while (queue.length !== 0) {
    const { key, node } = queue.shift()!
    res.addNode(key, node)

    const bids = _(node.subs).map('blockId').value()

    // add edges
    bids.forEach((bid) => res.addEdge(key, bid))

    const noIncludedBlockIds = _(bids)
      .filter((bid) => !res.hasNode(bid))
      .value()

    const noIncludedSqls = await loadSqlFromBlocks(noIncludedBlockIds)

    _(noIncludedSqls).forEach((sql, key) => queue.push({ key, node: sqlMacro(sql) }))
  }
  return res
}

function buildSqlFromGraph(rootKey: string, graph: DirectedGraph<SQLPieces, string>): string {
  const { subs, mainBody } = graph.getNode(rootKey)

  const commonTableExprs = subs.map(({ blockId, alias }) => {
    const cteBody = buildSqlFromGraph(blockId, graph)
    return `  ${alias} AS (\n    ${cteBody.replace(/\n/g, '\n    ')}\n  )`
  })

  if (commonTableExprs.length === 0) {
    return mainBody
  }

  // remove leading space and newlines, for further check
  const polishedMainBody = mainBody.trim()

  // compatible with `with recursive clause` in main body
  if (polishedMainBody.toLowerCase().startsWith('with recursive')) {
    return `WITH RECURSIVE \n${commonTableExprs.join(',\n')},\n${polishedMainBody.substring(15)}`
  }

  const commonTableExprBody = `WITH\n${commonTableExprs.join(',\n')}`
  // compatible with `with clause` in main body
  if (polishedMainBody.toLowerCase().startsWith('with ')) {
    return `${commonTableExprBody},\n${polishedMainBody.substring(5)}`
  }
  return `${commonTableExprBody}\n${polishedMainBody}`
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

export { match, translate, sqlMacro, extractPartialQueries }
