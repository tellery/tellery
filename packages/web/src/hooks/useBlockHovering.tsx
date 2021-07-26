import { useRecoilValue } from 'recoil'
import { IsBlockHovering } from '../components/editor/store'

export const useBlockHovering = (blockId: string) => {
  return useRecoilValue(IsBlockHovering(blockId))
}
