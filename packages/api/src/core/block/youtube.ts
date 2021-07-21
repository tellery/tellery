import { Block } from '.'
import { BlockType } from '../../types/block'

export class YouTubeBlock extends Block {
  static type = BlockType.YOUTUBE

  getType(): BlockType {
    return YouTubeBlock.type
  }
}
