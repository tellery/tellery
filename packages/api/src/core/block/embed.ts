import { Block } from '.'
import { BlockType } from '../../types/block'

export class EmbedBlock extends Block {
  static type = BlockType.EMBED

  getType(): BlockType {
    return EmbedBlock.type
  }
}
