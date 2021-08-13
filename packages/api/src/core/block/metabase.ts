import { Block } from '.'
import { BlockType } from '../../types/block'

export class MetabaseBlock extends Block {
  static type = BlockType.METABASE

  getType(): BlockType {
    return MetabaseBlock.type
  }
}
