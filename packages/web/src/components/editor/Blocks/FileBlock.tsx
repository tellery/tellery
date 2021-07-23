import React from 'react'
import { Editor } from '@app/types'
import { registerBlock, BlockComponent } from './utils'
import { UploadFilePlaceHolder } from '../BlockBase/UploadFilePlaceHolder'

const FileBlock: BlockComponent<
  React.FC<{
    block: Editor.FileBlock
  }>
> = ({ block }) => {
  return (
    <>{!block.content?.fileKey && <UploadFilePlaceHolder blockId={block.id} text="Click To Upload" accept="*" />}</>
  )
}

FileBlock.meta = {
  isText: false,
  hasChildren: false
}

registerBlock(Editor.BlockType.File, FileBlock)
