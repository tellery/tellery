import type { WritableDraft } from 'immer/dist/internal'
import type { MutableRefObject } from 'react'

export type SetBlock<BlockType> = (id: string, update: (block: WritableDraft<BlockType>) => void) => void

export interface BlockInstanceInterface {
  blockRef: MutableRefObject<any>
  wrapperElement: HTMLElement
}
