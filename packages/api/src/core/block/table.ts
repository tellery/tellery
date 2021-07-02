import { Block } from '.'
import { BlockType } from '../../types/block'

export class TableBlock extends Block {
  static type = BlockType.TABLE

  getType(): BlockType {
    return TableBlock.type
  }
}
