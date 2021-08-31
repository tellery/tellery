import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { LinkType } from '../../types/link'
import { SmartQueryExecution } from '../../types/queryBuilder'
import { Token } from '../../types/token'
import { Link } from '../link'
import { DataSource, Transcludable } from './interfaces'

type SmartQueryBlockContent = SmartQueryExecution & {
  title: Token[]
  snapshotId?: string
}

export class SmartQueryBlock extends Block implements DataSource, Transcludable {
  static type = BlockType.SMART_QUERY

  getType(): BlockType {
    return BlockType.SMART_QUERY
  }

  getContent(): SmartQueryBlockContent {
    return (this.content as SmartQueryBlockContent) ?? {}
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
        blockId: this.getContent().queryBuilderId,
        type: LinkType.QUESTION,
      },
    ]
  }
}
