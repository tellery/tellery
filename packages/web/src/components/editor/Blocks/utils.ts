import { Editor } from '@app/types'
import { BulletListBlock } from './BulletListBlock'
import { CodeBlock } from './CodeBlock'
import { ControlBlock } from './ControlBlock'
import { DividerBlock } from './DividerBlock'
import { EmbedBlock } from './EmbedBlock'
import { EquationBlock } from './EquationBlock'
import { FileBlock } from './FileBlock'
import { ColumnBlock, GridBlock } from './GridBlock'
import { ImageBlcok } from './ImageBlock'
import { MetabaseBlock } from './MetabaseBlock'
import { NumberedListBlock } from './NumberedListBlock'
import { QuoteBlock } from './QuoteBlock'
import { TextBlock } from './TextBlock'
import { TodoBlock } from './TodoBlock'
import { ToggleListBlock } from './ToggleListBlock'
import { VirtualBlock } from './VirtualBlock'
import { VisualizationBlock } from './VisualizationBlock'

export type BlockComponent<P = {}> = P & {
  meta: {
    hasChildren?: boolean
    isText?: boolean
    supportBlockFormat?: boolean
    needParentType?: boolean
    forwardRef?: boolean
    isQuestion?: boolean
    isResizeable?: boolean
    isDataAsset?: boolean
    isExecuteable?: boolean
    isQuery?: boolean
  }
}

const SQLBlock = { ...VirtualBlock } as BlockComponent<any>
SQLBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: false,
  isQuery: true
}

const QueryBuilderBlock = { ...VirtualBlock } as BlockComponent<any>
QueryBuilderBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: true,
  isQuery: true
}

const SnapshotBlock = { ...VirtualBlock } as BlockComponent<any>
SnapshotBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: false,
  isDataAsset: false,
  isQuery: true
}

const SmartQueryBlock = { ...VirtualBlock } as BlockComponent<any>
SmartQueryBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: false,
  isQuery: true
}

const DBTBlock = { ...VirtualBlock } as BlockComponent<any>
DBTBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: true,
  isQuery: true
}

export const Blocks: Record<string, BlockComponent<any>> = {
  [Editor.BlockType.Text]: TextBlock,
  [Editor.BlockType.Header]: TextBlock,
  [Editor.BlockType.SubHeader]: TextBlock,
  [Editor.BlockType.SubSubHeader]: TextBlock,
  [Editor.BlockType.BulletList]: BulletListBlock,
  [Editor.BlockType.Code]: CodeBlock,
  [Editor.BlockType.Control]: ControlBlock,
  [Editor.BlockType.Embed]: EmbedBlock,
  [Editor.BlockType.Divider]: DividerBlock,
  [Editor.BlockType.Equation]: EquationBlock,
  [Editor.BlockType.File]: FileBlock,
  [Editor.BlockType.Column]: ColumnBlock,
  [Editor.BlockType.Row]: GridBlock,
  [Editor.BlockType.File]: FileBlock,
  [Editor.BlockType.Image]: ImageBlcok,
  [Editor.BlockType.Metabase]: MetabaseBlock,
  [Editor.BlockType.NumberedList]: NumberedListBlock,
  [Editor.BlockType.Todo]: TodoBlock,
  [Editor.BlockType.Toggle]: ToggleListBlock,
  [Editor.BlockType.Visualization]: VisualizationBlock,
  [Editor.BlockType.Quote]: QuoteBlock,
  [Editor.BlockType.DBT]: DBTBlock,
  [Editor.BlockType.SQL]: SQLBlock,
  [Editor.BlockType.QueryBuilder]: QueryBuilderBlock,
  [Editor.BlockType.SmartQuery]: SmartQueryBlock,
  [Editor.BlockType.SnapshotBlock]: SnapshotBlock
}

export const isTextBlock = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isText
}

// TODO: remove later
export const isQuestionLikeBlock = (blockType: Editor.BlockType) => {
  return isVisualizationBlock(blockType)
}

export const isQueryBlock = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isQuery
}

export const isDataAssetBlock = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isDataAsset
}

export const isVisualizationBlock = (blockType: Editor.BlockType) => {
  return blockType === Editor.BlockType.Visualization
}

export const isExecuteableBlockType = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isExecuteable
}

export const isBlockHasChildren = (block: Editor.BaseBlock) => {
  return !!Blocks[block.type]?.meta.hasChildren
}

export const isResizebleBlockType = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isResizeable
}
