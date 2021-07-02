import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class DividerBlock extends TextBlock {
  static type = BlockType.DIVIDER

  getType(): BlockType {
    return DividerBlock.type
  }
}
