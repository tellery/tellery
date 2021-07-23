import { Block } from '.'
import { BlockType } from '../../types/block'

export class ObservablehqBlock extends Block {
  static type = BlockType.OBSERVEABLEHQ

  getType(): BlockType {
    return ObservablehqBlock.type
  }
}
