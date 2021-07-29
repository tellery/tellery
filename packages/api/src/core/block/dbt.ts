import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { DbtMetadata } from '../../types/dbt'
import { Token } from '../../types/token'
import { Link } from '../link'

type DbtBlockContent = {
  title: Token[]
} & DbtMetadata

export class DbtBlock extends Block {
  static type = BlockType.DBT

  getType(): BlockType {
    return DbtBlock.type
  }

  getPlainText(): string | undefined {
    return getPlainTextFromTokens(this.getContent().title)
  }

  private getContent(): DbtBlockContent {
    return (this.content as DbtBlockContent) ?? {}
  }

  getLinksFromContent(): Link[] {
    return []
  }

  getSql(): string {
    const { materialized, compiledSql, relationName } = this.getContent()
    switch (materialized) {
      case 'unknown':
        return 'UNKNOWN MATERIALIZATION'
      case 'ephemeral':
        return compiledSql
      default:
        return `SELECT * from ${relationName}`
    }
  }
}
