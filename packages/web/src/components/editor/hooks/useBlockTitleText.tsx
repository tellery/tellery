import { useBlockSnapshot } from '@app/store/block'
import type { Editor } from '@app/types'
import { useMemo } from 'react'
import { blockTitleToText } from '../helpers'
import { useBlockTitleAssets } from './useBlockTitleAssets'

export const useBlockTitleToText = (block: Editor.BaseBlock) => {
  const snapshot = useBlockSnapshot()
  const assets = useBlockTitleAssets(block.storyId!, block.id)

  return useMemo(() => {
    return blockTitleToText(block, snapshot)
    // keep assets in deps, trigger rerender after depends changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, snapshot, assets])
}
