import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

const SideBarConfigAtom = atomWithStorage('Tellery:RightSidebarConfig', {
  folded: true,
  width: 305
})

export const useRightSideBarConfig = () => {
  return useAtom(SideBarConfigAtom)
}
