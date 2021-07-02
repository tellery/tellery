import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class CalloutBlock extends TextBlock {
  static type = BlockType.CALLOUT

  getType(): BlockType {
    return CalloutBlock.type
  }
}
