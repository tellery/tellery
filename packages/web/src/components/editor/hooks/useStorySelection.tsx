/* eslint-disable camelcase */
import { dequal } from 'dequal'
import { useMemo } from 'react'
import { useRecoilTransaction_UNSTABLE, useRecoilValue } from 'recoil'
import type { TelleryBlockSelection, TelleryInlineSelection, TellerySelection } from '../helpers'
import { TelleryBlockSelectedAtom, TelleryBlockSelectionAtom, TelleryStorySelectionAtom } from '../store/selection'

export const useStorySelection = (storyId: string) => {
  const storySelection = useRecoilValue(TelleryStorySelectionAtom(storyId))
  const setStorySelection = useRecoilTransaction_UNSTABLE(
    ({ set, get }) =>
      (
        newSelectionOrUpdater: TellerySelection | null | ((currVal: TellerySelection | null) => TellerySelection | null)
      ) => {
        const previousSelection = get(TelleryStorySelectionAtom(storyId))
        const newSelection =
          typeof newSelectionOrUpdater === 'function' ? newSelectionOrUpdater(previousSelection) : newSelectionOrUpdater
        if (dequal(previousSelection, newSelection)) {
          return
        }
        // update block selected status atom family
        const previousSelectectBlocks = new Set((previousSelection as TelleryBlockSelection)?.selectedBlocks ?? [])
        const currentSelectedBlocks = new Set((newSelection as TelleryBlockSelection)?.selectedBlocks ?? [])

        if (previousSelectectBlocks.size || currentSelectedBlocks.size) {
          for (const elem of currentSelectedBlocks) {
            if (previousSelectectBlocks.has(elem) === false) {
              set(TelleryBlockSelectedAtom(elem), true)
            }
          }

          for (const elem of previousSelectectBlocks) {
            if (currentSelectedBlocks.has(elem) === false) {
              set(TelleryBlockSelectedAtom(elem), false)
            }
          }
        }

        // update content editble selection status atom family
        const previousInlineBlockId = (previousSelection as TelleryInlineSelection)?.anchor?.blockId
        const currentInlineBlockId = (newSelection as TelleryInlineSelection)?.anchor?.blockId

        if (previousInlineBlockId !== currentInlineBlockId) {
          if (previousInlineBlockId) {
            set(TelleryBlockSelectionAtom(previousInlineBlockId), null)
          }
          if (currentInlineBlockId) {
            set(TelleryBlockSelectionAtom(currentInlineBlockId), newSelection)
          }
        } else if (previousInlineBlockId !== null && currentInlineBlockId !== null) {
          set(TelleryBlockSelectionAtom(currentInlineBlockId), newSelection)
        }

        set(TelleryStorySelectionAtom(storyId), newSelection)
      },
    []
  )
  return useMemo(() => [storySelection, setStorySelection], [setStorySelection, storySelection]) as [
    TellerySelection | null,
    (
      newSelectionOrUpdater: TellerySelection | null | ((currVal: TellerySelection | null) => TellerySelection | null)
    ) => void
  ]
}
