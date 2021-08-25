import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { Field, Measurement } from '../../types/metric'
import { Token } from '../../types/token'
import { getLinksFromSql, Link } from '../link'
import { DataSource, Transclusible } from './interfaces'

type MetricBlockContent = {
  title: Token[]
  snapshotId?: string
  sql: string
  // generated from sql execution (table schema, where DataType can be refined by user)
  fields?: Field[]
  measurements?: { [id: string]: Measurement }
}
export class MetricBlock extends Block implements DataSource, Transclusible {
  static type = BlockType.METRIC

  getType(): BlockType {
    return MetricBlock.type
  }

  getContent(): MetricBlockContent {
    return (this.content as MetricBlockContent) ?? {}
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
