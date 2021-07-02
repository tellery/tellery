import React, { useContext } from 'react'
import type { Editor, TellerySelection } from 'types'
import type { BlockInstanceInterface, SetBlock } from '../types'

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
  registerOrUnregisterBlockInstance: (id: string, blockInstance?: BlockInstanceInterface) => void
  getBlockInstanceById: (id: string) => BlockInstanceInterface | undefined
  execOnNextFlush: (func: Function) => void
  getSelection: () => TellerySelection | null
  toggleBlockType: (id: string, type: Editor.BlockType, removePrefixCount: number) => void
  lockOrUnlockScroll: (lock: boolean) => void
  selectBlocks: (blockIds: string[]) => void
  storyId: string
}

export const useEditor = <BlockType extends unknown>() => {
  const editor = useContext(EditorContext)

  return editor as EditorContextInterface<BlockType> | null
}

export const EditorContext = React.createContext<EditorContextInterface<Editor.Block> | null>(null)
