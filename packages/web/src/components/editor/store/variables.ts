import { atom, atomFamily, selector } from 'recoil'

export const IsBlockHovering = atomFamily({
  key: 'IsBlockHovering',
  default: false
})

export const VariableAtom = atom<string | null>({
  key: 'HoveringBlockId',
  default: null
})

export const HovreringBlockId = selector<string | null>({
  key: 'HoveringBlockSelector',
  get: ({ get }) => get(HovreringBlockIdAtom),
  set: ({ set, get }, newBlockId) => {
    const currentHovringBlockId = get(HovreringBlockIdAtom)
    if (currentHovringBlockId !== newBlockId) {
      if (currentHovringBlockId) {
        set(IsBlockHovering(currentHovringBlockId as string), false)
      }
      set(HovreringBlockIdAtom, newBlockId as string)
      if (newBlockId) {
        set(IsBlockHovering(newBlockId as string), true)
      }
    }
  }
})
