import { TinyEmitter } from 'tiny-emitter'
import type { Editor } from '@app/types'

const emitter = new TinyEmitter()

const EVENT_BLOCK_MOUNTED = 'block:mounted'

const EVENT_BLOCK_REGISTER = 'block:register'

export const emitBlockMounted = (block: Editor.BaseBlock, element: HTMLDivElement) => {
  emitter.emit(`${EVENT_BLOCK_MOUNTED}`, block, element)
}

export const subscribeBlockMounted = (callback: (block: Editor.BaseBlock, element: HTMLDivElement) => void) => {
  emitter.on(`${EVENT_BLOCK_MOUNTED}`, callback)

  return () => {
    emitter.off(`${EVENT_BLOCK_MOUNTED}`, callback)
  }
}

export default emitter
