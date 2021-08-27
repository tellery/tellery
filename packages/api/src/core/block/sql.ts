import { BlockType } from '../../types/block'
import { Token } from '../../types/token'
import { getLinksFromSql, Link } from '../link'
import { Block, getPlainTextFromTokens } from '.'
import { DataSource, Transcludable } from './interfaces'

type SqlBlockContent = {
  title: Token[]
  forkedFromId?: string
  snapshotId?: string
  sql: string
}

export class SqlBlock extends Block implements DataSource, Transcludable {
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
    return getLinksFromSql(this.getSql())
  }

  getSql(): string {
    return this.getContent().sql
  }
}
