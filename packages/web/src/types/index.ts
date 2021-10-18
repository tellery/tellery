/// <reference types="resize-observer-browser" />
import type { Config, Type, Data } from '../components/v11n/types'
import type { MotionValue } from 'framer-motion'

// fix https://github.com/framer/motion/issues/840
declare module 'framer-motion' {
  type InferMotionValueType<T> = T extends MotionValue<infer R> ? R : never
  type InputValues<I extends MotionValue[]> = {
    [K in keyof I]: InferMotionValueType<I[K]>
  }

  type MultiTransformer<I extends MotionValue[], O> = (input: InputValues<[...I]>) => O

  export function useTransform<I extends MotionValue[], O>(
    input: [...I],
    transformer: MultiTransformer<[...I], O>
  ): MotionValue<O>
}

export type PermissionEntityRole = 'manager' | 'editor' | 'commentator' | 'viewer'
export type PermissionEntityRoleType = 'workspace' | 'group' | 'user'
export type Permission = { role: PermissionEntityRole; type: PermissionEntityRoleType; id?: string }
export type Permissions = Permission[]

export enum CodeBlockLang {
  TypeScipt = 'TypeScript',
  JavaScript = 'JavaScript',
  Java = 'Java',
  SQL = 'SQL',
  Python = 'Python',
  C = 'C',
  CPP = 'CPP',
  HTML = 'HTML',
  CSS = 'CSS',
  Kotlin = 'Kotlin',
  Swift = 'Swift',
  R = 'R',
  Golang = 'Golang',
  Yaml = 'Yaml',
  JSON = 'JSON',
  Markdown = 'Markdown'
  // PGSQL = 'PostgreSQL',
  // SQLMore = 'SQLMore'
}

export const CodeBlockLangDisplayName = {
  [CodeBlockLang.SQL]: 'SQL',
  [CodeBlockLang.Python]: 'Python',
  [CodeBlockLang.Java]: 'Java',
  [CodeBlockLang.Markdown]: 'Markdown',
  [CodeBlockLang.R]: 'R',
  [CodeBlockLang.C]: 'C',
  [CodeBlockLang.CPP]: 'C++',
  [CodeBlockLang.TypeScipt]: 'TypeScript',
  [CodeBlockLang.JavaScript]: 'JavaScript',
  [CodeBlockLang.HTML]: 'HTML',
  [CodeBlockLang.CSS]: 'CSS',
  [CodeBlockLang.Kotlin]: 'Kotlin',
  [CodeBlockLang.Swift]: 'Swift',
  [CodeBlockLang.Golang]: 'Golang',
  [CodeBlockLang.Yaml]: 'Yaml',
  [CodeBlockLang.JSON]: 'JSON'
  // [CodeBlockLang.PGSQL]: 'PostgreSQL'
  // [CodeBlockLang.SQLMore]: 'SQL More'
}

export type Snapshot = {
  data: Data
  id: string
  sql: string
  createdById?: string
  lastEditedById?: string
  questionId?: string
  createdAt?: string
}

export type AggregatedMetric = {
  name: string
  deprecated?: boolean
  fieldName: string
  fieldType: string
  func: string
}

export type CustomSQLMetric = {
  name: string
  deprecated?: boolean
  rawSql: string
}

export type Metric = AggregatedMetric | CustomSQLMetric

export type Dimension = {
  name: string
  fieldName: string
  fieldType: string
  func?: string
}

export namespace Editor {
  export enum InlineType {
    Link = 'a',
    Bold = 'b',
    Italic = 'i',
    Strike = 's',
    Underline = '_',
    Preformatted = 'p',
    Hightlighted = 'h',
    Reference = 'r',
    Code = 'c',
    Equation = 'e',
    Variable = 'v',
    Formula = 'f',

    // Temp useage only
    LocalClassnames = 'localClassnames',
    LocalIndex = 'localIndex'
  }
  export enum BlockType {
    BulletList = 'bulleted_list',
    Callout = 'callout',
    Code = 'code',
    Equation = 'equation',
    File = 'file',
    Header = 'heading_1',
    SubHeader = 'heading_2',
    SubSubHeader = 'heading_3',
    Image = 'image',
    NumberedList = 'numbered_list',
    Page = 'page',
    Quote = 'quote',
    Table = 'table',
    Text = 'text',
    Todo = 'todo',
    Toggle = 'toggle',
    Video = 'video',
    Divider = 'divider',
    Story = 'story',
    Row = 'row',
    Column = 'column',
    Thought = 'thought',
    Bookmark = 'bookmark',
    StoryLink = 'story_link',
    Visualization = 'visualization',
    SnapshotBlock = 'snapshot',
    QueryBuilder = 'query_builder',
    SmartQuery = 'smart_query',
    SQL = 'sql',
    DBT = 'dbt',
    Control = 'control',

    // embeds
    Embed = 'embed',
    Metabase = 'metabase',
    ModeAnalytics = 'mode_analytics',
    Figma = 'figma',
    Gist = 'gist',
    GoogleDrive = 'google_drive',
    Excalidraw = 'excalidraw',
    Codepen = 'codepen',
    Tweet = 'tweet',
    Observeablehq = 'observablehq',
    YouTube = 'youtube'
  }

  export enum BlockParentType {
    WORKSPACE = 'workspace',
    BLOCK = 'block'
  }

  export type TokenType = [InlineType, ...(string | number)[]]

  export type Token = [string, TokenType[]?]

  export type TextBlockContent = {
    title: Token[]
  }

  export type QueryBlockContent = {
    forkedFromId?: string
    snapshotId?: string
    lastRunAt?: number
    error?: string | null
  }

  export type VisualizationBlockContent = {
    visualization?: Config<Type>
    queryId?: string
    fromDataAssetId?: string
    fromQueryId?: string
  }

  export type CodeBlockContent = {
    title: Token[]
    lang: CodeBlockLang
  }

  export interface BaseBlock {
    lastEditedById?: string | null
    createdById?: string | null
    resourceType?: 'block'
    updatedAt: number
    createdAt: number
    format?: object
    id: string
    type: BlockType
    parentId: string
    parentTable: BlockParentType
    version: number
    children?: string[]
    alive: boolean
    permissions: Permission[]
    content?: {
      title?: Token[]
    }
    storyId?: string
  }

  export interface ContentBlock extends BaseBlock {
    format?: {
      width?: number
      aspectRatio?: number
      textAlign?: 'center' | 'left' | 'right'
    }
  }

  export interface BaseQueryBlock extends ContentBlock {
    content?: ContentBlock['content'] & QueryBlockContent
  }

  export interface QueryBuilder extends BaseQueryBlock {
    content?: BaseQueryBlock['content'] & {
      description?: string
      fields?: {
        name: string
        type: string
      }[]
      metrics?: {
        [id: string]: Metric
      }
    }
  }

  export interface SQLBlock extends BaseQueryBlock {
    content?: BaseQueryBlock['content'] & {
      sql?: string
    }
  }

  export interface SnapshotBlock extends BaseQueryBlock {}

  export type QueryBlock = SnapshotBlock | SQLBlock | QueryBuilder

  export type DataAssetBlock = QueryBuilder

  export interface SmartQueryBlock extends ContentBlock {
    content: ContentBlock['content'] & {
      queryBuilderId: string
      metricIds: string[]
      dimensions: Dimension[]
      // filters: Filter[]
      title: Token[]
      snapshotId?: string
    }
  }

  export interface VisualizationBlock extends ContentBlock {
    content?: ContentBlock['content'] & VisualizationBlockContent
  }

  export interface TodoBlock extends ContentBlock {
    content?: ContentBlock['content'] & { checked?: boolean }
  }

  export interface CodeBlock extends ContentBlock {
    content: ContentBlock['content'] & CodeBlockContent
  }

  export interface ControlBlock extends ContentBlock {
    content: ContentBlock['content'] & {
      name: string
      defaultValue: any
      type: 'text' | 'number'
    }
  }

  export interface ImageBlock extends ContentBlock {
    content?: ContentBlock['content'] & {
      fileKey?: string
      imageInfo?: ImageInfo
    }
  }

  export interface FileBlock extends ContentBlock {
    content: ContentBlock['content'] & {
      fileKey?: string
    }
  }

  export interface EmbedBlock extends ContentBlock {
    content: ContentBlock['content'] & {
      src?: string
    }
  }

  export interface MetabaseBlock extends ContentBlock {
    content: ContentBlock['content'] & {
      siteUrl?: string
      resourceType?: string
      resourceId?: number
      params?: object
      publicToken?: string
    }
  }

  export type Block =
    | MetabaseBlock
    | EmbedBlock
    | FileBlock
    | ImageBlock
    | CodeBlock
    | TodoBlock
    | DataAssetBlock
    | VisualizationBlock
    | SmartQueryBlock
    | ControlBlock
}

export interface ImageInfo {
  height: number
  width: number
}

export type FileInfo = {
  key: string
  hash: string
  bucket: string
  size: number
  name?: string
  ext?: string
  mimeType?: string
  imageInfo?: ImageInfo
}
export interface Story extends Editor.BaseBlock {
  type: Editor.BlockType.Story
  format?: {
    fullWidth?: boolean
    locked?: boolean
    refreshOnOpen?: boolean
    smallText?: boolean
    fontFamily?: string
    showBorder?: boolean
  }
}

export interface Thought extends Editor.BaseBlock {
  type: Editor.BlockType.Thought
  content: {
    title?: Editor.Token[]
    date: string // format: YYYY-MM-DD
  }
}

export type Ref = { blockId: string; storyId: string; type: 'block_ref' | 'question_ref' }

export type Asset = Story | Editor.BaseBlock

export type BackLinks = {
  forwardRefs: Ref[]
  backwardRefs: Ref[]
}

export interface UserInfo {
  id: string
  avatar?: string
  name: string
  email: string
}

export type Direction = 'left' | 'right' | 'top' | 'bottom'

export type Workspace = {
  id: string
  name: string
  avatar: string
  members: {
    createdAt: string
    workspaceId: string
    userId: string
    role: 'member' | 'admin'
    invitedAt: string
    joinAt: string
    invitedById?: string
  }[]
  memberNum: number
  createdAt: number
  preferences: {
    connectorId?: string
    dbImportsTo?: string
    profile?: string
    emailConfig?: boolean
  }
}

export type ProfileConfig = {
  type: string
  name: string
  configs: Record<string, string | number | boolean>
}

export type AvailableConfig = {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'FILE'
  name: string
  hint: string
  description: string
  required: boolean
  secret: boolean
  fillHint: boolean
}
