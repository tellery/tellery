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

  /**
   * Here the sql retrieved from dbtBlock depends on its materialization,
   * that is, if the compiled sql has been executed during transformation and saved into the data warehouse
   *
   * For non-ephemeral level, the query result can be referred directly by its relation name (which is a flatten name for adapting different data source)
   * The select-all clause will be returned for fulfilling CTE in this case.
   *
   * For ephemeral, actually this can be considered as a name-based transclusion (though it happens in the level of DBT), just return the compiled SQL.
   */
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
