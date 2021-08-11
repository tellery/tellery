import type { Editor } from '@app/types'

export enum DnDItemTypes {
  Block = 'block',
  File = 'file',
  BlockIds = 'block_ids'
}

export type DndItemDataBlockType = {
  type: DnDItemTypes.Block
  blockData: Editor.BaseBlock
  originalBlockId: string
}

export type DndItemDataFileType = {
  type: DnDItemTypes.File
}

export type DndItemDataBlockIdsType = {
  type: DnDItemTypes.BlockIds
  ids: string[]
  storyId: string
}

export type DndItemDataType = DndItemDataBlockType | DndItemDataBlockIdsType | DndItemDataFileType
