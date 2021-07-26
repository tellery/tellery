import { Block } from '.'
import { BlockType } from '../../types/block'

export class GoogleDriveBlock extends Block {
  static type = BlockType.GOOGLE_DRIVE

  getType(): BlockType {
    return GoogleDriveBlock.type
  }
}
