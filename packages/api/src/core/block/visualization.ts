import { Block } from '.'
import { BlockType } from '../../types/block'
import { LinkType } from '../../types/link'
import { Link } from '../link'

type VisualizationBlockContent = {
  dataAssetId?: string
  visualization?: Record<string, unknown>
}
export class VisualizationBlock extends Block {
  static type = BlockType.VISUALIZATION

  getType(): BlockType {
    return VisualizationBlock.type
  }

  private getContent(): VisualizationBlockContent {
    return (this.content as VisualizationBlockContent) ?? {}
  }

  getLinksFromContent(): Link[] {
    if (!this.alive) {
      return []
    }
    const { dataAssetId } = this.getContent()
    if (!dataAssetId) {
      return []
    }
    return [
      {
        blockId: dataAssetId,
        type: LinkType.BLOCK,
      },
    ]
  }
}
