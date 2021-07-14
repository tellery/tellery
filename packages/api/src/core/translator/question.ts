import _ from 'lodash'
import { getRepository, In } from 'typeorm'
import BlockEntity from '../../entities/block'
import { CyclicTransclusionError, NotFoundError } from '../../error/error'
import { BlockType } from '../../types/block'
import { DirectedGraph } from '../../utils/directedgraph'
import { sqlMacro, SQLPieces } from '../../utils/sql'
import { QuestionBlock } from '../block/question'

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

async function loadSqlFromBlocks(blockIds: string[]): Promise<{ [k: string]: string }> {
  const records = await getRepository(BlockEntity).find({
    id: In(blockIds),
    alive: true,
    type: BlockType.QUESTION,
  })

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
    // validate the integrity of blocks
    if (_(noIncludedSqls).size() !== noIncludedBlockIds.length) {
      throw NotFoundError.resourceNotFound(
        _.xor(_.keys(noIncludedSqls), noIncludedBlockIds).toString(),
      )
    }

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

export { match, translate }
