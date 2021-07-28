import { Block } from '.'
import { BlockType } from '../../types/block'

export class StoryLinkBlock extends Block {
  static type = BlockType.STORY_LINK

  getType(): BlockType {
    return StoryLinkBlock.type
  }
}
