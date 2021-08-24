import React, { useContext } from 'react'
import type { Editor } from '@app/types'
import type { TellerySelection } from '../helpers'
import type { SetBlock } from '../types'
import type { SetterOrUpdater } from 'recoil'

export type EditorContextInterface<BlockType> = {
  insertNewEmptyBlock: (
    blockType: Editor.BlockType,
    targetBlockId: string,
    direction: 'top' | 'bottom' | 'child'
  ) => Editor.BaseBlock
  updateBlockTitle: (blockId: string, tokens: Editor.Token[]) => void
  updateBlockProps: (blockId: string, path: string[], args: {}) => void
  blurEditor: () => void
  // moveBlocks: (sourceBlockIds: string[], targetBlockId: string, direction: 'left' | 'right' | 'bottom' | 'top') => void
  setSelectionState: SetterOrUpdater<TellerySelection | null>
  removeBlocks: (targetBlockIds: string[]) => void
  deleteBackward: (unit: 'character', options: { selection: TellerySelection }) => void
  getSelection: () => TellerySelection | null
  toggleBlockType: (id: string, type: Editor.BlockType, removePrefixCount: number) => void
  lockOrUnlockScroll: (lock: boolean) => void
  selectBlocks: (blockIds: string[]) => void
  storyId: string
  duplicateHandler: (blockIds: string[]) => Editor.BaseBlock[] | undefined
}

export const useEditor = <BlockType extends Editor.BaseBlock>() => {
  const editor = useContext(EditorContext)

  return editor as EditorContextInterface<BlockType> | null
}

export const EditorContext = React.createContext<EditorContextInterface<Editor.BaseBlock> | null>(null)
