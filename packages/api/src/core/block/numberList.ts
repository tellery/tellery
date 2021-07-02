import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class NumberListBlock extends TextBlock {
  static type = BlockType.NUMBERED_LIST

  getType(): BlockType {
    return NumberListBlock.type
  }
}
