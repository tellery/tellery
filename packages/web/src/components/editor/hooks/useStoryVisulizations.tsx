import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { useMemo } from 'react'
import { isVisualizationBlock } from '../Blocks/utils'
import { getFilteredOrderdSubsetOfBlocks } from '../utils'

export const useStoryVisualizations = (storyId: string) => {
  const storyBlocksMap = useStoryBlocksMap(storyId)
  const questionLikeBlocks = useMemo(() => {
    if (!storyBlocksMap) return []
    return getFilteredOrderdSubsetOfBlocks(storyBlocksMap, storyId, (block) => isVisualizationBlock(block.type))
  }, [storyBlocksMap, storyId])
  return questionLikeBlocks
}
