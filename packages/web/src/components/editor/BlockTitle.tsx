import React from 'react'
import type { Editor } from '@app/types'
import { useBlockTitleToText } from './hooks/useBlockTitleText'

const BlockTitleContent: React.FC<{ block: Editor.BaseBlock }> = ({ block }) => {
  const text = useBlockTitleToText(block)

  return <>{text}</>
}

export const BlockTitle: React.FC<{ block: Editor.BaseBlock }> = ({ block }) => {
  return (
    <React.Suspense fallback={<></>}>
      <BlockTitleContent block={block}></BlockTitleContent>
    </React.Suspense>
  )
}
