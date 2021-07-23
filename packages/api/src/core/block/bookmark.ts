import { Block } from '.'
import { BlockType } from '../../types/block'

export class BookmarkBlock extends Block {
  static type = BlockType.BOOKMARK

  getType(): BlockType {
    return BookmarkBlock.type
  }
}
