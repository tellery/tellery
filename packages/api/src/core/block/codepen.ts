import { Block } from '.'
import { BlockType } from '../../types/block'

export class CodepenBlock extends Block {
  static type = BlockType.CODEPEN

  getType(): BlockType {
    return CodepenBlock.type
  }
}
