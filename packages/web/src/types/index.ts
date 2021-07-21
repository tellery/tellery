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

export enum DnDItemTypes {
  Block = 'block',
  File = 'file'
}
export type PermissionEntityRole = 'manager' | 'editor' | 'commentator' | 'viewer'
export type PermissionEntityRoleType = 'workspace' | 'group' | 'user'
export type Permission = { role: PermissionEntityRole; type: PermissionEntityRoleType; id?: string }
export type Permissions = Permission[]

export enum CodeBlockLang {
  TypeScipt = 'TypeScript',
  JavaScript = 'JavaScript',
  SQL = 'SQL',
  PGSQL = 'PostgreSQL',
  SQLMore = 'SQLMore'
}

export type Snapshot = {
  data: Data
  date: string
  id: string
  sql: string
  createdById?: string
  lastEditedById?: string
  questionId?: string
  createdAt?: string
}

export const CodeBlockLangDisplayName = {
  [CodeBlockLang.TypeScipt]: 'TypeScript',
  [CodeBlockLang.JavaScript]: 'JavaScript',
  [CodeBlockLang.SQL]: 'SQL',
  [CodeBlockLang.PGSQL]: 'PostgreSQL',
  [CodeBlockLang.SQLMore]: 'SQL More'
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
    Code = 'c'
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
    Question = 'question',
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
    QuestionReference = 'question_reference',

    // embeds
    Embed = 'embed',
    Metabase = 'metabse',
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

  export type TokenType = [InlineType, ...string[]]

  export type Token = [string, TokenType[]?]

  export type TextBlockContent = {
    title: Token[]
  }

  export type QuestionBlockContent = {
    forkedFromId?: string
    snapshotId?: string
    visualization?: Config<Type>
    sql?: string
    lastRunAt?: number
    error?: string | null
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

  export interface QuestionBlock extends ContentBlock {
    content?: ContentBlock['content'] & QuestionBlockContent
  }

  export interface TodoBlock extends ContentBlock {
    content?: ContentBlock['content'] & { checked?: boolean }
  }

  export interface CodeBlock extends ContentBlock {
    content: ContentBlock['content'] & CodeBlockContent
  }

  export interface ImageBlock extends ContentBlock {
    content: ContentBlock['content'] & {
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

  export type Block = ImageBlock | QuestionBlock | ContentBlock
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

export type Ref = { blockId: string; storyId: string }

export type Asset = Story | Editor.Block

export type TellerySelectionNode = {
  blockId: string
  nodeIndex: number
  offset: number
}

export enum TellerySelectionType {
  Inline,
  Block
}

export type TelleryBlockSelection = {
  type: TellerySelectionType.Block
  selectedBlocks: string[]
}

export type TelleryInlineSelection = {
  type: TellerySelectionType.Inline
  focus: TellerySelectionNode
  anchor: TellerySelectionNode
}

export type TellerySelection = (TelleryBlockSelection | TelleryInlineSelection) & { storyId: string }

export type BackLinks = {
  forwardRefs: Ref[]
  backwardRefs: Ref[]
}

export type DropItem = {
  type: DnDItemTypes
  blocks?: Editor.Block[]
  storyId?: string
  files?: FileList
  id: string
  // removeSelfHandler(): void
}

export interface UserInfo {
  id: string
  avatar: string
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
}
