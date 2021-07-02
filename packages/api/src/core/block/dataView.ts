import { Block } from '.'
import { BlockType } from '../../types/block'

export class DataViewBlock extends Block {
  static type = BlockType.DATA_VIEW

  getType(): BlockType {
    return DataViewBlock.type
  }
}
