import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStoryPathParams } from './useStoryPathParams'

export const usePushFocusedBlockIdState = () => {
  const navigate = useNavigate()
  const storyId = useStoryPathParams()

  const scrollToBlock = useCallback(
    (blockId: string, blockStoryId: string = '', openMenu: boolean = false, select: boolean = true) => {
      if (blockStoryId === storyId) {
        navigate(`#${blockId}`, {
          state: {
            focusedBlockId: blockId,
            openMenu: openMenu,
            select: select
          }
        })
      } else {
        navigate('#', {
          state: {
            focusedBlockId: blockId,
            openMenu: openMenu,
            select: select
          }
        })
      }
    },
    [navigate, storyId]
  )

  return scrollToBlock
}
