import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class Heading2Block extends TextBlock {
  static type = BlockType.HEADING_2

  getType(): BlockType {
    return Heading2Block.type
  }
}
