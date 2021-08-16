import { useRecoilValue } from 'recoil'
import { VariableAtomFamily } from '../store/variables'

export const useVariable = (storyId: string, formula: string) => {
  const state = useRecoilValue(VariableAtomFamily({ storyId, formula }))
  return state
}
