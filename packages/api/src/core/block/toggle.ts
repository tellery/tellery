import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class ToggleBlock extends TextBlock {
  static type = BlockType.TOGGLE

  getType(): BlockType {
    return ToggleBlock.type
  }
}
