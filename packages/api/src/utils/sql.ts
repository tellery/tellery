import _ from 'lodash'
import { customAlphabet } from 'nanoid'

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
  '\\{\\{\\s*([a-zA-Z0-9-_]+)\\s*(?:as\\s+(\\w[\\w\\d]*))?\\s*\\}\\}',
  'gi',
)

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

export { PartialQuery, SQLPieces, extractPartialQueries, sqlMacro }
