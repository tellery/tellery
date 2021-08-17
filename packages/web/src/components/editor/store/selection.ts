import { atomFamily, selectorFamily } from 'recoil'
import type { TelleryBlockSelection, TelleryInlineSelection, TellerySelection } from '../helpers'

export const TelleryStorySelectionAtom = atomFamily<TellerySelection | null, string>({
  key: 'TelleryGlobalSelection', // unique ID (with respect to other atoms/selectors)
  default: null // default value (aka initial value)
})

export const TelleryBlockSelectedAtom = atomFamily({
  key: 'TelleryBlockSelected',
  default: false
})

export const TelleryBlockSelectionAtom = atomFamily<TellerySelection | null, string>({
  key: 'TelleryBlockSelection',
  default: null
})

export const TelleryStorySelection = selectorFamily<TellerySelection | null, string>({
  key: 'TelleryStorySelection',
  get:
    (storyId) =>
    ({ get }) => {
      return get(TelleryStorySelectionAtom(storyId))
    },
  set:
    (storyId) =>
    ({ set, get }, newSelection) => {
      const previousSelection = get(TelleryStorySelectionAtom(storyId))

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
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})
