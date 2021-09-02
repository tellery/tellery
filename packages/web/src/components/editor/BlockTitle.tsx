import React from 'react'
import type { Editor } from '@app/types'
import { useBlockTitleToText } from './hooks/useBlockTitleText'

export const BlockTitle: React.FC<{ block: Editor.BaseBlock }> = ({ block }) => {
  const text = useBlockTitleToText(block)

  return <>{text}</>
}
