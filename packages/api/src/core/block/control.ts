import { Block } from '.'
import { BlockType } from '../../types/block'

export class ControlBlock extends Block {
  static type = BlockType.CONTROL

  getType(): BlockType {
    return ControlBlock.type
  }
}
