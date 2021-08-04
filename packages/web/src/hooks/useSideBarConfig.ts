import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

const SideBarConfigAtom = atomWithStorage('Tellery:SidebarConfig:2', {
  folded: true
})

export const useSideBarConfig = () => {
  return useAtom(SideBarConfigAtom)
}
