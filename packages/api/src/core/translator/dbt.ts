import _ from 'lodash'
import { Block } from '../block'

/**
 * Only match DBT Blocks
 */
function match(block: Block): boolean {
  // TODO: support custom block type
  return (block.getType() as string) === 'dbt'
}

/**
 * Assist param to an executable statement
 *
 * Here the sql retrieved from dbtBlock depends on its materialization,
 * that is, if the compiled sql has been executed during transformation and saved into the data warehouse
 *
 * For non-ephemeral level, the query result can be referred directly by its relation name (which is a flatten name for adapting different data source)
 * The select-all clause will be returned for fulfilling CTE in this case.
 *
 * For ephemeral, actually this can be considered as a name-based transclusion (though it happens in the level of DBT), just return the compiled SQL.
 */
function translate(block: Block): string {
  const materialization = _(block.content).get('materialized')
  if (materialization === 'ephemeral') {
    return _(block.content).get('compiledSql')
  }
  return `select * from ${_(block.content).get('relationName')}`
}

export { match, translate }
