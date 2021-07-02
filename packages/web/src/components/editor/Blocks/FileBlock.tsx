import React from 'react'
import type { Editor } from 'types'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'

export const FileBlock: React.FC<{
  block: Editor.Block
}> = ({ block }) => {
  return (
    <>
      <BlockPlaceHolder text="Uploading" loading={true} onClick={() => {}} />
    </>
  )
}
