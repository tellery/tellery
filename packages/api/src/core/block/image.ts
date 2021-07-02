import { Block } from '.'
import { BlockType } from '../../types/block'

export class ImageBlock extends Block {
  static type = BlockType.IMAGE

  getType(): BlockType {
    return ImageBlock.type
  }
}
