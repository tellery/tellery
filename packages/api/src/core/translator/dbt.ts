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
 * The implementation overrides `getSql` of DbtBlock
 */
async function translate(block: Block): Promise<string> {
  return (block as DbtBlock).getSql()
}

export { match, translate }
