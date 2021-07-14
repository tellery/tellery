import { TinyEmitter } from 'tiny-emitter'
import type { Editor } from 'types'

const emitter = new TinyEmitter()

const EVENT_BLOCK_MOUNTED = 'block:mounted'

export const emitBlockMounted = (block: Editor.BaseBlock, element: HTMLDivElement) => {
  emitter.emit(`${EVENT_BLOCK_MOUNTED}:${block.id}`, block, element)
}

export const subscribeBlockMounted = (
  blockId: string,
  callback: (block: Editor.BaseBlock, element: HTMLDivElement) => void
) => {
  emitter.on(`${EVENT_BLOCK_MOUNTED}:${blockId}`, callback)

  return () => {
    emitter.off(`${EVENT_BLOCK_MOUNTED}:${blockId}`, callback)
  }
}

export const subscribeBlockMountedOnce = (
  blockId: string,
  callback: (block: Editor.BaseBlock, element: HTMLDivElement) => void
) => {
  emitter.once(`${EVENT_BLOCK_MOUNTED}:${blockId}`, callback)
}

export default emitter
