import type React from 'react'
import type { Editor } from '@app/types'

export type BlockComponent<P = {}> = P & {
  meta: {
    hasChildren?: boolean
    isText?: boolean
    supportBlockFormat?: boolean
    needParentType?: boolean
    forwardRef?: boolean
    isQuestion?: boolean
    isResizeable?: boolean
  }
}

export const Blocks: Record<string, BlockComponent<React.FC | React.ForwardRefRenderFunction<any, any>>> = {}

export const registerBlock = (type: Editor.BlockType, component: any) => {
  Blocks[type] = component
}

export const isTextBlock = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isText
}

export const isQuestionLikeBlock = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isQuestion
}

export const isBlockHasChildren = (block: Editor.Block) => {
  return !!Blocks[block.type]?.meta.hasChildren
}

export const isResizebleBlockType = (blockType: Editor.BlockType) => {
  return !!Blocks[blockType]?.meta.isResizeable
}
