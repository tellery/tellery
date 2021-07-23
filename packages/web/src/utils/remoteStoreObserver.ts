import { TinyEmitter } from 'tiny-emitter'
import type { Editor } from '@app/types'

const emitter = new TinyEmitter()

export const emitBlockUpdate = (block: Editor.BaseBlock) => {
  emitter.emit(`block-update:${block.id}`, block)
}

export const subscribeBlockUpdate = (blockId: string, callback: (block: Editor.BaseBlock) => void) => {
  emitter.on(`block-update:${blockId}`, callback)

  return () => {
    emitter.off('block-update', callback)
  }
}

export default emitter
