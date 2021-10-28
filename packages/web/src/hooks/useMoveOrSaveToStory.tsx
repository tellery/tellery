import { getDuplicatedBlocksFragment } from '@app/context/editorTranscations'
import { useGetBlock } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { Editor } from '@app/types'
import { useCallback } from 'react'

export const useMoveOrSaveToStory = (
  blockFragment: { children: string[]; data: Record<string, Editor.BaseBlock> } | null,
  mode: 'move' | 'save'
) => {
  const blockTranscations = useBlockTranscations()
  const getBlock = useGetBlock()

  const moveToStory = useCallback(
    async (storyId: string) => {
      if (!blockFragment) return
      const story = await getBlock(storyId)
      const children = story.children ?? []
      const targetBlockId = children[children.length - 1] ?? storyId
      const direction = children.length ? 'bottom' : 'child'

      const newBlockFragment =
        mode === 'save'
          ? getDuplicatedBlocksFragment(blockFragment.children, blockFragment.data, storyId, targetBlockId, {})
          : blockFragment
      const action = mode === 'save' ? blockTranscations.insertBlocks : blockTranscations.moveBlocks
      await action(storyId, {
        blocksFragment: newBlockFragment,
        targetBlockId: targetBlockId,
        direction
      })
    },
    [blockFragment, blockTranscations.insertBlocks, blockTranscations.moveBlocks, getBlock, mode]
  )
  return moveToStory
}
