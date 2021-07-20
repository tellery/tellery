import type { Editor } from '@app/types'
import React, { memo, ReactNode } from 'react'
import type { BlockFormatInterface } from '../hooks'
import './BulletListBlock'
import './CodeBlock'
import { DeletedBlock } from './DeletedBlock'
import './DividerBlock'
import './EmbedBlock'
import './FileBlock'
import './ImageBlock'
import { NoPermissionBlock } from './NoPermisionBlock'
import './NumberedListBlock'
import './QuestionBlock'
import './QuoteBlock'
import './TextBlock'
import './TitleBlock'
import './TodoBlock'
import './ToggleListBlock'
import './GridBlock'

import { UnknownBlock } from './UnknownBlock'
import { Blocks } from './utils'

const _BlockInner: React.FC<{
  block: Editor.Block
  children?: ReactNode
  blockFormat?: BlockFormatInterface
  parentType?: Editor.BlockType
}> = ({ block, children, blockFormat, parentType }) => {
  if (block.alive === false) {
    return <DeletedBlock block={block}></DeletedBlock>
  }
  if (block.permissions.length === 0) {
    return <NoPermissionBlock block={block} />
  }

  const Component = Blocks[block.type] as any
  if (!Component) {
    console.log(block.type)
    return <UnknownBlock block={block}></UnknownBlock>
  }

  return (
    <Component block={block} blockFormat={blockFormat} parentType={parentType}>
      {children}
    </Component>
  )
}

export const BlockInner = memo(_BlockInner, (prev, next) => {
  return (
    prev.block.version === next.block.version &&
    prev.blockFormat === next.blockFormat &&
    prev.parentType === next.parentType
  )
})
