import { Block } from '.'
import { BlockType } from '../../types/block'

export class GistBlock extends Block {
  static type = BlockType.GIST

  getType(): BlockType {
    return GistBlock.type
  }
}
