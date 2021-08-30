import { atomFamily } from 'recoil'
import type { TellerySelection } from '../helpers'

export const TelleryStorySelectionAtom = atomFamily<TellerySelection | null, string>({
  key: 'TelleryGlobalSelection',
  default: null
})

export const TelleryBlockSelectedAtom = atomFamily({
  key: 'TelleryBlockSelected',
  default: false
})

export const TelleryBlockSelectionAtom = atomFamily<TellerySelection | null, string>({
  key: 'TelleryBlockSelection',
  default: null
})
