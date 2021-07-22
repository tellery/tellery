import React, { useContext } from 'react'
import type { Editor } from 'types'
import type { TellerySelection } from '../helpers'
import type { SetBlock } from '../types'

export type EditorContextInterface<BlockType> = {
  insertNewEmptyBlock: (
    blockType: Editor.BlockType,
    targetBlockId: string,
    direction: 'top' | 'bottom' | 'child'
  ) => Editor.BaseBlock
  setBlockValue: SetBlock<BlockType>
  blurEditor: () => void
  // moveBlocks: (sourceBlockIds: string[], targetBlockId: string, direction: 'left' | 'right' | 'bottom' | 'top') => void
  setSelectionState: (newSelectionState: TellerySelection | null) => void
  removeBlocks: (targetBlockIds: string[]) => void
  deleteBackward: (unit: 'character', options: { selection: TellerySelection }) => void
  getSelection: () => TellerySelection | null
  toggleBlockType: (id: string, type: Editor.BlockType, removePrefixCount: number) => void
  lockOrUnlockScroll: (lock: boolean) => void
  selectBlocks: (blockIds: string[]) => void
  storyId: string
  duplicateHandler: (blockIds: string[]) => Editor.BaseBlock[] | undefined
  focusBlockHandler: (blockId: string, openMenu: boolean) => void
}

export const useEditor = <BlockType extends unknown>() => {
  const editor = useContext(EditorContext)

  return editor as EditorContextInterface<BlockType> | null
}

export const EditorContext = React.createContext<EditorContextInterface<Editor.Block> | null>(null)
