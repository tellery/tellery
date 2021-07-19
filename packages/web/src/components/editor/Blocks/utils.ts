import type React from 'react'
import type { Editor } from '@app/types'

export type BlockComponent<P = {}> = P & {
  meta: {
    hasChildren?: boolean
    isText?: boolean
    supportBlockFormat?: boolean
    needParentType?: boolean
  }
}

export const Blocks: Record<string, BlockComponent<React.FC>> = {}

export const registerBlock = (type: Editor.BlockType, component: any) => {
  console.log('register block')
  Blocks[type] = component
}
