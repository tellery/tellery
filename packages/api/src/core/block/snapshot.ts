import { Block } from '.'
import { BlockType } from '../../types/block'
import { DataSource } from './interfaces'

export class SnapshotBlock extends Block implements DataSource {
  static type = BlockType.SNAPSHOT

  getType(): BlockType {
    return SnapshotBlock.type
  }
}
