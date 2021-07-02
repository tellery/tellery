import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class QuoteBlock extends TextBlock {
  static type = BlockType.QUOTE

  getType(): BlockType {
    return QuoteBlock.type
  }
}
