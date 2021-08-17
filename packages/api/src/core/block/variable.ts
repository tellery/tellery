import { Block } from '.'
import { BlockType } from '../../types/block'
import { Link } from '../link'
import { DataSource } from './interfaces'

type VariableBlockContent = {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'timestamp'
  value: string
}
export class VariableBlock extends Block implements DataSource {
  static type = BlockType.VARIABLE

  getType(): BlockType {
    return VariableBlock.type
  }

  getPlainText(): string | undefined {
    return this.getContent().name
  }

  private getContent(): VariableBlockContent {
    return (this.content as VariableBlockContent) ?? {}
  }

  getLinksFromContent(): Link[] {
    // TODO: consider the case that the variable refers to another variable / data source
    return []
  }
}
