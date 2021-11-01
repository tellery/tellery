import type { Editor } from '@app/types'

export enum DnDItemTypes {
  Block = 'block',
  File = 'file',
  BlockIds = 'block_ids',
  BlocksFragment = 'blocks_fragment'
}

export type DndItemDataBlockType = {
  type: DnDItemTypes.Block
  blockData: Editor.BaseBlock
  originalBlockId: string
}

export type DndItemDataFileType = {
  type: DnDItemTypes.File
}

export type BlockFragment = {
  children: string[]
  data: Record<string, Editor.Block>
}

export type DndBlocksFragment = {
  type: DnDItemTypes.BlocksFragment
  originalBlockId: string
} & BlockFragment

export type DndItemDataBlockIdsType = {
  type: DnDItemTypes.BlockIds
  ids: string[]
  storyId: string
}

export type DndItemDataType = DndItemDataBlockType | DndItemDataBlockIdsType | DndItemDataFileType | DndBlocksFragment
