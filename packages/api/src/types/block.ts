import { PermissionsDTO } from './permission'

enum BlockType {
  BULLETED_LIST = 'bulleted_list',
  CALLOUT = 'callout',
  CODE = 'code',
  DATA_VIEW = 'data_view',
  DBT = 'dbt',
  EQUATION = 'equation',
  FILE = 'file',
  HEADING_1 = 'heading_1',
  HEADING_2 = 'heading_2',
  HEADING_3 = 'heading_3',
  IMAGE = 'image',
  NUMBERED_LIST = 'numbered_list',
  STORY = 'story',
  QUERY_BUILDER = 'query_builder',
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
  BOOKMARK = 'bookmark',
  STORY_LINK = 'story_link',
  SQL = 'sql',
  VISUALIZATION = 'visualization',
  SNAPSHOT = 'snapshot',
  VARIABLE = 'variable',
  SMART_QUERY = 'smart_query',

  // embeds
  EMBED = 'embed',
  METABASE = 'metabase',
  MODE_ANALYTICS = 'mode_analytics',
  FIGMA = 'figma',
  GIST = 'gist',
  GOOGLE_DRIVE = 'google_drive',
  EXCALIDRAW = 'excalidraw',
  CODEPEN = 'codepen',
  TWEET = 'tweet',
  OBSERVEABLEHQ = 'observablehq',
  YOUTUBE = 'youtube',

  // deprecated
  QUESTION = 'question',
  QUESTION_SNAPSHOT = 'question_snapshot',
}

enum BlockParentType {
  WORKSPACE = 'workspace',
  BLOCK = 'block',
}

type BlockDTO = {
  id: string
  type: BlockType
  parentId: string
  parentTable: BlockParentType
  storyId: string
  content: any
  format?: any
  children?: string[]
  resources?: string[]
  createdAt: number
  updatedAt: number
  permissions: PermissionsDTO
  version: number
  createdById?: string
  lastEditedById?: string
  alive: boolean
}

export { BlockType, BlockDTO, BlockParentType }
