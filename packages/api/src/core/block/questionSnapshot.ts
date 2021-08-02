import { Block } from '.'
import { BlockType } from '../../types/block'

export class QuestionSnapshotBlock extends Block {
  static type = BlockType.QUESTION_SNAPSHOT

  getType(): BlockType {
    return QuestionSnapshotBlock.type
  }
}
