import { PermissionsDTO } from './permission'

enum BlockType {
  BULLETED_LIST = 'bulleted_list',
  CALLOUT = 'callout',
  CODE = 'code',
  DATA_VIEW = 'data_view',
  EQUATION = 'equation',
  FILE = 'file',
  HEADING_1 = 'heading_1',
  HEADING_2 = 'heading_2',
  HEADING_3 = 'heading_3',
  IMAGE = 'image',
  NUMBERED_LIST = 'numbered_list',
  STORY = 'story',
  QUESTION = 'question',
  QUOTE = 'quote',
  TABLE = 'table',
  TEXT = 'text',
  THOUGHT = 'thought',
  TODO = 'todo',
  TOGGLE = 'toggle',
  VIDEO = 'video',
  DIVIDER = 'divider',
  ROW = 'row',
  COLUMN = 'column',
  // Deprecated
  DEPRECATED_RICH_TEXT = 'RICH_TEXT',
  DEPRECATED_QUESTION = 'QUESTION',
  DEPRECATED_IMAGE = 'IMAGE',
}

enum BlockParentType {
  WORKSPACE = 'workspace',
  BLOCK = 'block',
}

/**
 * the leading R stands for Response
 */
type BlockDTO = {
  id: string
  type: BlockType
  parentId: string
  parentTable: BlockParentType
  storyId: string
  content: any
  format?: any
  children?: string[]
  createdAt: number
  updatedAt: number
  permissions: PermissionsDTO
  version: number
  createdById?: string
  lastEditedById?: string
  alive: boolean
}

export { BlockType, BlockDTO, BlockParentType }
