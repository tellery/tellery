import { Block } from '.'
import { BlockType } from '../../types/block'

export class ExcalidrawBlock extends Block {
  static type = BlockType.EXCALIDRAW

  getType(): BlockType {
    return ExcalidrawBlock.type
  }
}
