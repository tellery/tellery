import { useRecoilValue } from 'recoil'
import { FormulaSelectorFamily } from '../store/variables'

export const useFormula = (storyId: string, formula: string) => {
  const state = useRecoilValue(FormulaSelectorFamily({ storyId, formula }))
  return state
}
