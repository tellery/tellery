import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

const SideBarConfigAtom = atomWithStorage('Tellery:SidebarConfig:1', {
  x: 240,
  folded: false
})

export const useSideBarConfig = () => {
  return useAtom(SideBarConfigAtom)
}
