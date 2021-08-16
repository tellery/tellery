import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { useMemo } from 'react'
import { isQuestionLikeBlock } from '../Blocks/utils'
import { getFilteredOrderdSubsetOfBlocks } from '../utils'

export const useStoryQustions = (storyId: string) => {
  const storyBlocksMap = useStoryBlocksMap(storyId)
  const questionLikeBlocks = useMemo(() => {
    if (!storyBlocksMap) return []
    return getFilteredOrderdSubsetOfBlocks(storyBlocksMap, storyId, (block) => isQuestionLikeBlock(block.type))
  }, [storyBlocksMap, storyId])
  return questionLikeBlocks
}
