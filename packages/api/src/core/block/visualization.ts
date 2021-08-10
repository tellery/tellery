import { Block } from '.'
import { BlockType } from '../../types/block'

export class VisualizationBlock extends Block {
  static type = BlockType.VISUALIZATION

  getType(): BlockType {
    return VisualizationBlock.type
  }
}
