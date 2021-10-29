import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useGetBlock } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { Editor } from '@app/types'
import { parseTelleryUrl, TelleryGlyph } from '@app/utils'
import update from 'immutability-helper'
import { useCallback, useEffect } from 'react'
import { mergeTokens } from '..'
import { isVisualizationBlock } from '../Blocks/utils'
import { TellerySelection, TellerySelectionType } from '../helpers'
import { useSetPastedActions } from './usePastedActionsState'
import { urlPastedSubject } from '../oberveables'

export const useHandleUrlPasted = (
  storyId: string,
  getSelection: () => TellerySelection | null,
  updateBlockTitle: (blockId: string, tokens: Editor.Token[]) => void
) => {
  const snapshot = useBlockSnapshot()
  const blockTranscations = useBlockTranscations()
  const setPastedActions = useSetPastedActions()
  const getBlock = useGetBlock()
  const handleUrlPaste = useCallback(
    async (url: string) => {
      const selectionState = getSelection()
      const telleryUrlParams = parseTelleryUrl(url)
      if (!selectionState) return
      if (selectionState.type !== TellerySelectionType.Inline) return
      const currentBlock = getBlockFromSnapshot(selectionState.anchor.blockId, snapshot)
      const tokens = currentBlock!.content!.title ?? []

      const getRemovePastedUrlTokens = () => {
        const newTokens = update(tokens, { $splice: [[selectionState.focus.nodeIndex, 1]] })
        return newTokens
      }

      if (telleryUrlParams && telleryUrlParams.blockId) {
        const block = await getBlock(telleryUrlParams.blockId)
        if (isVisualizationBlock(block.type)) {
          const linkdBlock = createEmptyBlock({
            content: block.content,
            children: [],
            format: block.format,
            storyId: storyId,
            type: block.type,
            parentId: storyId
          })
          setPastedActions([
            { type: 'Dismiss', action: () => {} },
            {
              type: 'Create linked question',
              action: () => {
                updateBlockTitle(currentBlock.id, getRemovePastedUrlTokens())
                blockTranscations.insertBlocks(storyId, {
                  blocksFragment: {
                    children: [linkdBlock.id],
                    data: { [linkdBlock.id]: linkdBlock }
                  },
                  targetBlockId: selectionState.anchor.blockId,
                  direction: 'bottom'
                })
              }
            }
          ])
        }
      }
      if (telleryUrlParams && !telleryUrlParams.blockId) {
        setPastedActions([
          { type: 'Dismiss', action: () => {} },
          {
            type: 'Link story',
            action: () => {
              const newTokens = mergeTokens([
                ...getRemovePastedUrlTokens(),
                [TelleryGlyph.BI_LINK, [[Editor.InlineType.Reference, 's', telleryUrlParams.storyId]]]
              ])
              updateBlockTitle(currentBlock.id, newTokens)
            }
          }
        ])
      }
    },
    [getSelection, getBlock, storyId, setPastedActions, blockTranscations, snapshot, updateBlockTitle]
  )

  useEffect(() => {
    const subscription = urlPastedSubject.subscribe((content) => {
      handleUrlPaste(content)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [handleUrlPaste])
}
