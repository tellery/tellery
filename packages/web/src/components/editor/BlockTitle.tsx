import React from 'react'
import type { Editor } from '@app/types'
import { useBlockTitleToText } from './hooks/useBlockTitleText'

export const BlockTitle: ReactFCWithChildren<{ block: Editor.BaseBlock }> = ({ block }) => {
  const text = useBlockTitleToText(block)

  return <>{text}</>
}
