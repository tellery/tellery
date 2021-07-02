import { Block } from '.'
import { BlockType } from '../../types/block'

export class RowBlock extends Block {
  static type = BlockType.ROW

  getType(): BlockType {
    return RowBlock.type
  }
}
