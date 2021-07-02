import type { WritableDraft } from 'immer/dist/internal'

export type SetBlock<BlockType> = (id: string, update: (block: WritableDraft<BlockType>) => void) => void

export interface BlockInstanceInterface {
  openMenu: () => void
  afterDuplicate?: () => void
}
