import { BlockType } from '../../types/block'
import { SqlBlock } from './sql'

export class MetricBlock extends SqlBlock {
  static type = BlockType.METRIC

  getType(): BlockType {
    return MetricBlock.type
  }
}
