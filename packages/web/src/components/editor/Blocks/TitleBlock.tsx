import { Editor } from '@app/types'
import React from 'react'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { BlockComponent, registerBlock } from './utils'

export const TitleBlock: BlockComponent<React.FC<{ block: Editor.BaseBlock }>> = (props: {
  block: Editor.BaseBlock
}) => {
  const { readonly } = useBlockBehavior()

  const { block } = props
  if (!block) return null
  return (
    block && (
      <ContentEditable
        disableReferenceDropdown
        disableSlashCommand
        disableTextToolBar
        block={block}
        placeHolderStrategy="always"
        placeHolderText="Untitled"
        readonly={readonly}
      />
    )
  )
}

TitleBlock.meta = {
  isText: true,
  hasChildren: true
}

registerBlock(Editor.BlockType.Story, TitleBlock)
