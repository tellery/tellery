import { BlockType } from '../../types/block'
import { QuestionBlock } from './question'

export class MetricBlock extends QuestionBlock {
  static type = BlockType.METRIC

  getType(): BlockType {
    return MetricBlock.type
  }
}
