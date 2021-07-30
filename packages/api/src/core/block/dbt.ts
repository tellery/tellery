import { Block, getPlainTextFromTokens } from '.'
import { DBTError } from '../../error/error'
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
        throw DBTError.unknownMaterializationError()
      case 'ephemeral':
        return compiledSql
      default:
        return `SELECT * from ${relationName}`
    }
  }

  // used for generating downstream tasks, to correctly specify the reference type
  getRef(): string {
    const { type, name, sourceTable } = this.getContent()
    switch (type) {
      case 'model':
        return `{{ ref('${name}') }}`
      case 'source':
        return `{{ source('${name}', '${sourceTable}') }}`
      default:
        throw DBTError.unspecifiedTypeError()
    }
  }
}
