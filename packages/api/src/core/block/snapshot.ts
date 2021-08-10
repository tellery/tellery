import { Block } from '.'
import { BlockType } from '../../types/block'

export class SnapshotBlock extends Block {
  static type = BlockType.SNAPSHOT

  getType(): BlockType {
    return SnapshotBlock.type
  }
}
