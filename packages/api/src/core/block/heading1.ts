import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class Heading1Block extends TextBlock {
  static type = BlockType.HEADING_1

  getType(): BlockType {
    return Heading1Block.type
  }
}
