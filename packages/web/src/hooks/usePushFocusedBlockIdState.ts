import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useStoryPathParams } from './useStoryPathParams'

export const usePushFocusedBlockIdState = () => {
  const history = useHistory()
  const storyId = useStoryPathParams()

  const scrollToBlock = useCallback(
    (blockId: string, blockStoryId?: string) => {
      if (blockStoryId === storyId) {
        history.push(`#${blockId}`, {
          focusedBlockId: blockId
        })
      } else {
        history.push('#', {
          focusedBlockId: blockId
        })
      }
    },
    [history, storyId]
  )

  return scrollToBlock
}
