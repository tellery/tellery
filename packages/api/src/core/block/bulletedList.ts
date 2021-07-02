import { BlockType } from '../../types/block'
import { TextBlock } from './text'

export class BulletedListBlock extends TextBlock {
  static type = BlockType.BULLETED_LIST

  getType(): BlockType {
    return BulletedListBlock.type
  }
}
