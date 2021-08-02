import { useCallback } from 'react'
import { useHistory, useRouteMatch } from 'react-router-dom'

export const usePushFocusedBlockIdState = () => {
  const history = useHistory()
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')
  const storyId = matchStory?.params.id

  const scrollToBlock = useCallback(
    (blockId: string, blockStoryId?: string) => {
      if (blockStoryId === storyId) {
        history.push(`#${blockStoryId}`, {
          focusedBlockId: blockStoryId
        })
      } else {
        history.push('#', {
          focusedBlockId: blockStoryId
        })
      }
    },
    [history, storyId]
  )

  return scrollToBlock
}
