import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { LinkType } from '../../types/link'
import { ExplorationExecution } from '../../types/metric'
import { Token } from '../../types/token'
import { Link } from '../link'
import { DataSource, Transcludable } from './interfaces'

type ExplorationBlockContent = ExplorationExecution & {
  title: Token[]
  snapshotId?: string
}

export class ExplorationBlock extends Block implements DataSource, Transcludable {
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
