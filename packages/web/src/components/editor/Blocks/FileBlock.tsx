import React from 'react'
import { Editor } from '@app/types'
import { BlockComponent } from './utils'
import { UploadFilePlaceHolder } from '../BlockBase/UploadFilePlaceHolder'

const _FileBlock: BlockComponent<
  ReactFCWithChildren<{
    block: Editor.FileBlock
  }>
> = ({ block }) => {
  return (
    <>
      {!block.content?.fileKey && (
        <UploadFilePlaceHolder blockId={block.id} text="Click to upload Image, CSV and Excel" accept="*" />
      )}
    </>
  )
}

_FileBlock.meta = {
  isText: false,
  hasChildren: false
}

export const FileBlock = _FileBlock
