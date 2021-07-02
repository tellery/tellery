import { Block } from '.'
import { BlockType } from '../../types/block'

export class ColumnBlock extends Block {
  static type = BlockType.COLUMN

  getType(): BlockType {
    return ColumnBlock.type
  }
}
