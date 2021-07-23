import { useRecoilState } from 'recoil'
import { HovreringBlockId } from '../store'

export const useBlockHoveringState = () => {
  return useRecoilState(HovreringBlockId)
}
