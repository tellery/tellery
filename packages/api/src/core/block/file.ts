import { Block } from '.'
import { BlockType } from '../../types/block'

export class FileBlock extends Block {
  static type = BlockType.FILE

  getType(): BlockType {
    return FileBlock.type
  }
}
