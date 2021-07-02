import { Block } from '.'
import { BlockType } from '../../types/block'

export class VideoBlock extends Block {
  static type = BlockType.VIDEO

  getType(): BlockType {
    return VideoBlock.type
  }
}
