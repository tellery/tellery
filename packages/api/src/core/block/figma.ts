import { Block } from '.'
import { BlockType } from '../../types/block'

export class FigmaBlock extends Block {
  static type = BlockType.FIGMA

  getType(): BlockType {
    return FigmaBlock.type
  }
}
