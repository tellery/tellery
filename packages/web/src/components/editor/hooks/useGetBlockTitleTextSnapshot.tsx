import { useCallback } from 'react'
import { useBlockSnapshot } from '@app/store/block'
import type { Editor } from '@app/types'
import { blockTitleToText } from '../helpers'

export const useGetBlockTitleTextSnapshot = () => {
  const snapshot = useBlockSnapshot()
  const getText = useCallback(
    (block: Editor.BaseBlock) => {
      return blockTitleToText(block, snapshot)
    },
    [snapshot]
  )

  return getText
}
