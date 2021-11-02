import { useAtom } from 'jotai'
import { atomWithStorage, useUpdateAtom } from 'jotai/utils'

const SideBarUIConfigAtom = atomWithStorage('Tellery:RightSidebarUIConfig', {
  folded: true,
  width: 305
})

export const useRightSideBarUIConfig = () => {
  return useAtom(SideBarUIConfigAtom)
}

export const useSetRightSideBarUIConfig = () => {
  return useUpdateAtom(SideBarUIConfigAtom)
}
