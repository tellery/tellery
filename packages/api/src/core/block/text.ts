import { uniqBy } from 'lodash'
import { Block, getPlainTextFromTokens } from '.'
import { BlockType } from '../../types/block'
import { Token } from '../../types/token'
import { getLinksFromToken, Link } from '../link'

export type TextBlockContent = {
  title: Token[]
}

export class TextBlock extends Block {
  static type = BlockType.TEXT

  getType(): BlockType {
    return TextBlock.type
  }

  // content => string[][]
  getPlainText(): string | undefined {
    return getPlainTextFromTokens(this.getContent().title)
  }

  getLinksFromContent(): Link[] {
    // if the block has been deleted, links should be empty
    if (!this.alive) {
      return []
    }
    return uniqBy(getLinksFromToken(this.getContent().title), 'blockId')
  }

  getContent(): TextBlockContent {
    return (this.content as TextBlockContent) ?? {}
  }
}
