import { atomFamily } from 'recoil'
import type { TellerySelection } from '../helpers'

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
