import type React from 'react'
import { Editor } from '@app/types'

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

export const Blocks: Record<string, BlockComponent<React.FC | React.ForwardRefRenderFunction<any, any>>> = {}

export const registerBlock = (type: Editor.BlockType, component: any) => {
  Blocks[type] = component
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
