import _ from 'lodash'
import { Block } from '../block'
import { DbtBlock } from '../block/dbt'

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
 *
 * The implementation overrides `getSql` of DbtBlock
 */
function translate(block: Block): string {
  return (block as DbtBlock).getSql()
}

export { match, translate }
