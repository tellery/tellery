import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { LinkType } from '../../types/link'
import { Dimension } from '../../types/metric'
import { Token } from '../../types/token'
import { Link } from '../link'
import { DataSource } from './interfaces'

type ExplorationBlockContent = {
  title: Token[]
  metricId: string
  snapshotId?: string
  measurementIds: string[]
  dimensions: Dimension[]
  // filters: string[]
}

export class ExplorationBlock extends Block implements DataSource {
  static type = BlockType.EXPLORATION

  getType(): BlockType {
    return BlockType.EXPLORATION
  }

  getContent(): ExplorationBlockContent {
    return (this.content as ExplorationBlockContent) ?? {}
  }

  getPlainText(): string | undefined {
    return getPlainTextFromTokens(this.getContent().title)
  }

  getLinksFromContent(): Link[] {
    if (!this.alive) {
      return []
    }
    return [
      {
        blockId: this.getContent().metricId,
        type: LinkType.QUESTION,
      },
    ]
  }
}
