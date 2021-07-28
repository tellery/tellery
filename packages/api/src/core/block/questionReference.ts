import { Block } from '.'
import { BlockType } from '../../types/block'

export class QuestionReferenceBlock extends Block {
  static type = BlockType.QUESTION_REFERENCE

  getType(): BlockType {
    return QuestionReferenceBlock.type
  }
}
