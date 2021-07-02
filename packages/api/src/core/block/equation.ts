import { Block } from '.'
import { BlockType } from '../../types/block'

export class EquationBlock extends Block {
  static type = BlockType.EQUATION

  getType(): BlockType {
    return EquationBlock.type
  }
}
