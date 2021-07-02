import { uniqBy } from 'lodash'
import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { Token } from '../../types/token'
import { getLinksFromSql, Link } from '../link'

type QuestionBlockContent = {
  title: Token[]
  // Just for record currently
  forkedFromId?: string
  snapshotId?: string
  sql: string
}

export class QuestionBlock extends Block {
  static type = BlockType.QUESTION

  getType(): BlockType {
    return QuestionBlock.type
  }

  getPlainText(): string | undefined {
    const title = getPlainTextFromTokens(this.getContent().title)
    return this.getSql() ? `${title} ${this.getSql()}` : title
  }

  private getContent(): QuestionBlockContent {
    return (this.content as QuestionBlockContent) ?? {}
  }

  getLinksFromContent(): Link[] {
    // if the block has been deleted, links should be empty
    if (!this.alive) {
      return []
    }
    // extract questions it referred by transclusion from its sql
    return uniqBy(getLinksFromSql(this.getSql()), 'blockId')
  }

  getSql(): string {
    return this.getContent().sql
  }
}
