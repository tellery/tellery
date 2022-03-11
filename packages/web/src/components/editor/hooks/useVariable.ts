import { useCallback } from 'react'
import { useRecoilState } from 'recoil'
import { VariableAtomFamily } from '../store/variables'

export const useVariable = (storyId: string, name: string) => {
  const state = useRecoilState(VariableAtomFamily({ storyId, name }))
  return state
}

export const useVariableCurrentValueState = (storyId: string, name: string) => {
  const [state, setState] = useRecoilState(VariableAtomFamily({ storyId, name }))
  const setValue = useCallback(
    (value: unknown) => {
      setState((oldState) => {
        return {
          ...oldState,
          currentValue: value
        }
      })
    },
    [setState]
  )
  return [state.currentValue, setValue] as [unknown, (value: unknown) => void]
}

export const useVariableDefaultValueState = (storyId: string, name: string) => {
  const [state, setState] = useRecoilState(VariableAtomFamily({ storyId, name }))
  const setValue = useCallback(
    (value: unknown) => {
      setState((oldState) => {
        return {
          ...oldState,
          defaultValue: value,
          currentValue: value
        }
      })
    },
    [setState]
  )
  return [state.currentValue, setValue] as [unknown, (value: unknown) => void]
}
