import React from 'react'
import type { Editor } from 'types'
import { UploadFilePlaceHolder } from '../BlockBase/UploadFilePlaceHolder'

export const FileBlock: React.FC<{
  block: Editor.FileBlock
}> = ({ block }) => {
  return (
    <>{!block.content?.fileKey && <UploadFilePlaceHolder blockId={block.id} text="Click To Upload" accept="*" />}</>
  )
}
