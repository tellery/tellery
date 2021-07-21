import type React from 'react'
import type { Editor } from '@app/types'

export type BlockComponent<P = {}> = P & {
  meta: {
    hasChildren?: boolean
    isText?: boolean
    supportBlockFormat?: boolean
    needParentType?: boolean
    forwardRef?: boolean
  }
}

export const Blocks: Record<string, BlockComponent<React.FC | React.ForwardRefRenderFunction<any, any>>> = {}

export const registerBlock = (type: Editor.BlockType, component: any) => {
  Blocks[type] = component
}
