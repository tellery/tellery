import _ from 'lodash'
import { BlockType } from '../../types/block'
import { Token } from '../../types/token'
import { Link } from '../link'
import { extractPartialQueries } from '../translator'
import { LinkType } from '../../types/link'
import { Block, getPlainTextFromTokens } from '.'
import { DataSource, Transclusible } from './interfaces'

type SqlBlockContent = {
  title: Token[]
  forkedFromId?: string
  snapshotId?: string
  sql: string
}

export class SqlBlock extends Block implements DataSource, Transclusible {
  static type = BlockType.SQL

  getType(): BlockType {
    return SqlBlock.type
  }

  private getContent(): SqlBlockContent {
    return (this.content as SqlBlockContent) ?? {}
  }

  getPlainText(): string | undefined {
    return getPlainTextFromTokens(this.getContent().title)
  }

  getLinksFromContent(): Link[] {
    // if the block has been deleted, links should be empty
    if (!this.alive) {
      return []
    }
    const input = this.getSql()
    if (!input) {
      return []
    }
    const partialQueries = extractPartialQueries(input)
    const links = _.map(partialQueries, ({ blockId }) => ({
      blockId,
      type: LinkType.QUESTION,
    }))
    // extract questions it referred by transclusion from its sql
    return _.uniqBy(links, 'blockId')
  }

  getSql(): string {
    return this.getContent().sql
  }
}
