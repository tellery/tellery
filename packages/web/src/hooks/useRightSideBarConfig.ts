import { useAtom } from 'jotai'
import { atomWithStorage, useUpdateAtom } from 'jotai/utils'

const SideBarConfigAtom = atomWithStorage('Tellery:RightSidebarConfig', {
  folded: true,
  width: 305
})

export const useRightSideBarConfig = () => {
  return useAtom(SideBarConfigAtom)
}

export const useSetRightSideBarConfig = () => {
  return useUpdateAtom(SideBarConfigAtom)
}
