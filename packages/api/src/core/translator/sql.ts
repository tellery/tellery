import { BlockType } from '../../types/block'
import { Block } from '../block'
import { SqlBlock } from '../block/sql'

function match(block: Block): boolean {
  return block.getType() === BlockType.SQL || block.getType() === BlockType.QUERY_BUILDER
}

/**
 * In SQL Block, we get its original SQL directly through the getSql method
 */
async function translate(block: Block): Promise<string> {
  return (block as SqlBlock).getSql()
}

export { match, translate }
