import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { Field, Metric } from '../../types/queryBuilder'
import { Token } from '../../types/token'
import { getLinksFromSql, Link } from '../link'
import { DataSource, Transcludable } from './interfaces'

type QueryBuilderBlockContent = {
  title: Token[]
  snapshotId?: string
  sql: string
  // generated from sql execution (table schema, where DataType can be refined by user)
  fields?: Field[]
  metrics?: { [id: string]: Metric }
}
export class QueryBuilderBlock extends Block implements DataSource, Transcludable {
  static type = BlockType.QUERY_BUILDER

  getType(): BlockType {
    return QueryBuilderBlock.type
  }

  getContent(): QueryBuilderBlockContent {
    return (this.content as QueryBuilderBlockContent) ?? {}
  }

  getPlainText(): string | undefined {
    return getPlainTextFromTokens(this.getContent().title)
  }

  getLinksFromContent(): Link[] {
    if (!this.alive) {
      return []
    }
    return getLinksFromSql(this.getSql())
  }

  getSql(): string {
    return this.getContent().sql
  }
}
