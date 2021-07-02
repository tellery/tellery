import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class Heading3Block extends TextBlock {
  static type = BlockType.HEADING_3

  getType(): BlockType {
    return Heading3Block.type
  }
}
