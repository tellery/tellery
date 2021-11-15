import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import copy from 'copy-to-clipboard'
import React, { useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  convertBlocksOrTokensToPureText,
  getBlocksFragmentFromSelection,
  mergeTokens,
  splitToken,
  TelleryPasteFragment,
  tokenPosition2SplitedTokenPosition
} from '..'
import { TellerySelection, TellerySelectionType } from '../helpers'
import { logger } from '../StoryEditor'

export const useEditorClipboardManager = (
  storyId: string,
  getSelection: () => TellerySelection | null,
  updateBlockTitle: any
) => {
  const snapshot = useBlockSnapshot()
  const blockTranscations = useBlockTranscations()
  const workspace = useWorkspace()

  const setClipboardWithFragment = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>, fragment: TelleryPasteFragment) => {
      logger('on copy set')
      if (e.clipboardData) {
        // const blocks = Object.values(editorState.blocksMap)
        e.clipboardData.setData(fragment.type, JSON.stringify(fragment.value))
        e.clipboardData.setData('text/plain', convertBlocksOrTokensToPureText(fragment, snapshot))
        logger('set success', fragment)
      }
    },
    [snapshot]
  )

  const deleteBlockFragmentFromSelection = useCallback(() => {
    const selectionState = getSelection()
    if (selectionState === null) return
    if (selectionState?.type === TellerySelectionType.Inline) {
      const block = getBlockFromSnapshot(selectionState.anchor.blockId, snapshot)
      const tokens = block?.content?.title || []
      const splitedTokens = splitToken(tokens)

      const startPosition =
        selectionState.anchor.blockId === block.id && selectionState.anchor.nodeIndex !== -1
          ? tokenPosition2SplitedTokenPosition(tokens, selectionState.anchor.nodeIndex, selectionState.anchor.offset)
          : null
      const endPosition =
        selectionState.focus.blockId === block.id && selectionState.anchor.nodeIndex !== -1
          ? tokenPosition2SplitedTokenPosition(tokens, selectionState.focus.nodeIndex, selectionState.focus.offset)
          : null

      if (startPosition !== null && endPosition !== null) {
        updateBlockTitle(
          block.id,
          mergeTokens([...splitedTokens.slice(0, startPosition), ...splitedTokens.slice(endPosition)])
        )
      }
    } else {
      blockTranscations.removeBlocks(storyId, selectionState.selectedBlocks)
    }
  }, [blockTranscations, getSelection, snapshot, storyId, updateBlockTitle])

  const doCut = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement> | KeyboardEvent) => {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      const selectionState = getSelection()
      const fragment = selectionState ? getBlocksFragmentFromSelection(selectionState, snapshot, workspace.id) : null
      if (!fragment) return
      e.preventDefault()
      copy('tellery', {
        debug: true,
        onCopy: (clipboardData) => {
          setClipboardWithFragment({ clipboardData } as React.ClipboardEvent<HTMLDivElement>, fragment)
          deleteBlockFragmentFromSelection()
          toast.success('Content copied')
        }
      })
    },
    [deleteBlockFragmentFromSelection, getSelection, setClipboardWithFragment, snapshot, workspace.id]
  )

  const doCopy = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement> | KeyboardEvent) => {
      const selectionState = getSelection()
      const fragment = selectionState ? getBlocksFragmentFromSelection(selectionState, snapshot, workspace.id) : null
      if (!fragment) return
      e.preventDefault()
      copy('tellery', {
        debug: true,
        onCopy: (clipboardData) => {
          setClipboardWithFragment({ clipboardData } as React.ClipboardEvent<HTMLDivElement>, fragment)
          toast.success('Content copied')
        }
      })
    },
    [getSelection, setClipboardWithFragment, snapshot, workspace.id]
  )

  return useMemo(
    () => ({
      doCut,
      doCopy
    }),
    [doCopy, doCut]
  )
}
