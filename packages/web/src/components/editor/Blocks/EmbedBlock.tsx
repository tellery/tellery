import React from 'react'
import { Editor } from 'types'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockComponent, registerBlock } from './utils'

const EmbedBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
  }>
> = ({ block }) => {
  return (
    <>
      <BlockPlaceHolder text="Uploading" loading={true} onClick={() => {}} />
    </>
  )
}

EmbedBlock.meta = {
  isText: false,
  hasChildren: false
}
registerBlock(Editor.BlockType.Embed, EmbedBlock)
