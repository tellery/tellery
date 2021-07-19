import { useRecoilValue } from 'recoil'
import { TelleryBlockSelectionAtom } from '../store/selection'

export const useLocalSelection = (blockId: string) => {
  const localSelection = useRecoilValue(TelleryBlockSelectionAtom(blockId))
  return localSelection
}
