import { BlockType } from '../../types/block'
import { onlyForCreatedUser, PermissionModel } from '../../types/permission'
import { Link } from '../link'
import { StoryBlock } from './story'

type ThoughtBlockContent = {
  // YYYY-MM-DD
  date: string
}

export class ThoughtBlock extends StoryBlock {
  static type = BlockType.THOUGHT

  getType(): BlockType {
    return ThoughtBlock.type
  }

  getInterKey(): string {
    return `${this.createdById}${this.getDate()}`
  }

  getPlainText(): string {
    return `💭 ${this.getDate()}`
  }

  getLinksFromContent(): Link[] {
    return []
  }

  getDate(): string {
    return (this.content as ThoughtBlockContent).date
  }

  /**
   * @returns the default permission of thought block is visible only by me
   */
  async getPermissions(): Promise<PermissionModel[]> {
    return onlyForCreatedUser(this.createdById)
  }
}
