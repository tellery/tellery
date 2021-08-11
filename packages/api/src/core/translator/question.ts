import { BlockType } from '../../types/block'
import { Block } from '../block'
import { QuestionBlock } from '../block/question'

/**
 * Only match Question blocks
 */
function match(block: Block): boolean {
  // metric block extends question block
  return block.getType() === BlockType.SQL || block.getType() === BlockType.METRIC
}

/**
 * Assist param to an executable statement
 * In Question Block, we get its original SQL directly through the getSql method
 */
function translate(block: Block): string {
  return (block as QuestionBlock).getSql()
}

export { match, translate }
