import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getRepository, In } from 'typeorm'
import BlockEntity from '../../entities/block'
import { NotFoundError } from '../../error/error'
import { BlockType } from '../../types/block'

// Matching the form of {{ dbt: xxx }}
const dbtQueryPattern = new RegExp(`{{\\s*dbt\\s*:\\s*([a-zA-Z0-9-_]+)\\s*}}`, 'gi')

type PartialQuery = {
  startIndex: number
  endIndex: number
  dbt: string
  alias: string
}

function extractPartialQueries(sql: string): PartialQuery[] {
  const matches = Array.from(sql.matchAll(dbtQueryPattern))

  return _(matches)
    .map((m) => ({
      startIndex: m.index!,
      endIndex: m.index! + m[0].length,
      dbt: m[1],
    }))
    .map((m) => ({
      ...m,
      alias: nanoid(m.endIndex - m.startIndex), // make sure the length of alias equals the length of {{dbt:xxx}}
    }))
    .value()
}

/**
 * @return key: interKey, value: dbt sql
 * dbt sql => ref('xxx') / source('xxx)
 */
async function loadDbtSqlByInterKeys(keys: string[]): Promise<{ [k: string]: string }> {
  const blocks = await getRepository(BlockEntity).find({
    interKey: In(keys),
    alive: true,
    // TODO: Now not support custom BlockType, need to support if after
    type: 'dbt' as BlockType,
  })

  if (blocks.length !== keys.length) {
    throw NotFoundError.resourceNotFound(_.xor(_(blocks).map('interKey').value(), keys).toString())
  }

  return _(blocks)
    .keyBy('interKey')
    .mapValues((b) => `${_(b.content).get('type')}('${b.interKey}')`)
    .value()
}

/**
 * This is the default translator, its matching priority is the lowest. It will match all that is not matched by other Translator
 */
function match(sql: string): boolean {
  return !!sql.match(dbtQueryPattern)
}

/**
 * Assist param to an executable statement
 */
async function translate(sql: string): Promise<string> {
  const queries = extractPartialQueries(sql)

  const dbtMap = await loadDbtSqlByInterKeys(_(queries).map('dbt').value())

  let res = sql

  _(queries).forEach(
    (q) => (res = `${res.substring(0, q.startIndex)}${q.alias}${res.substring(q.endIndex)}`),
  )

  _(queries).forEach((q) => (res = res.replace(q.alias, dbtMap[q.dbt])))
  return res
}

export { match, translate, extractPartialQueries }
