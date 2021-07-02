import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class CodeBlock extends TextBlock {
  static type = BlockType.CODE

  getType(): BlockType {
    return CodeBlock.type
  }
}
