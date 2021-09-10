import { useRecoilState, useSetRecoilState } from 'recoil'
import { VariableAtomFamily } from '../store/variables'

export const useVariable = (storyId: string, name: string) => {
  const state = useRecoilState(VariableAtomFamily({ storyId, name }))
  return state
}

export const useSetVariable = (storyId: string, name: string) => {
  const setState = useSetRecoilState(VariableAtomFamily({ storyId, name }))
  return setState
}
