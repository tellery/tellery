import { css, cx } from '@emotion/css'
import React from 'react'
import { Editor } from '@app/types'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { BlockComponent, registerBlock } from './utils'

export const TitleBlock: BlockComponent<React.FC<{ block: Editor.Block }>> = (props: { block: Editor.Block }) => {
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
