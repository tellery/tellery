import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class TODOBlock extends TextBlock {
  static type = BlockType.TODO

  getType(): BlockType {
    return TODOBlock.type
  }
}
