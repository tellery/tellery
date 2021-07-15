import { BlockType } from '../../types/block'
import { Block } from '../block'
import { QuestionBlock } from '../block/question'

/**
 * This is the default translator, its matching priority is the lowest. It will match all that is not matched by other Translator
 */
function match(block: Block): boolean {
  return block.getType() === BlockType.QUESTION
}

/**
 * Assist param to an executable statement
 */
function translate(block: Block): string {
  return (block as QuestionBlock).getSql()
}

export { match, translate }
