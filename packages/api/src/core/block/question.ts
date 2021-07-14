import { map, uniqBy } from 'lodash'
import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { LinkType } from '../../types/link'
import { Token } from '../../types/token'
import { Link } from '../link'
import { extractPartialQueries } from '../translator/question'

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
    return getPlainTextFromTokens(this.getContent().title)
  }

  private getContent(): QuestionBlockContent {
    return (this.content as QuestionBlockContent) ?? {}
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
    const links = map(partialQueries, ({ blockId }) => ({
      blockId,
      type: LinkType.QUESTION,
    }))
    // extract questions it referred by transclusion from its sql
    return uniqBy(links, 'blockId')
  }

  getSql(): string {
    return this.getContent().sql
  }
}
