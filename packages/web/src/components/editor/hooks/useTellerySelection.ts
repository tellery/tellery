import { useRecoilValue } from 'recoil'
import { TelleryBlockSelectionAtom } from '../store/selection'

export const useTellerySelection = (blockId: string) => useRecoilValue(TelleryBlockSelectionAtom(blockId))
