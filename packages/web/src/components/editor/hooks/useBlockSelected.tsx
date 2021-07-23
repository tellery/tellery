import { TelleryBlockSelectedAtom } from '@app/components/editor/store/selection'
import { useRecoilValue } from 'recoil'

export const useBlockSelected = (blockId: string) => {
  return useRecoilValue(TelleryBlockSelectedAtom(blockId))
}
