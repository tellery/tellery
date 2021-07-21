import { Block } from '.'
import { BlockType } from '../../types/block'

export class TweetBlock extends Block {
  static type = BlockType.TWEET

  getType(): BlockType {
    return TweetBlock.type
  }
}
