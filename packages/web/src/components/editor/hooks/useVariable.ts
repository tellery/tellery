import { useCallback } from 'react'
import { DefaultValue, useRecoilState } from 'recoil'
import { TelleryVariable, VariableAtomFamily } from '../store/variables'

export const useVariableState = (storyId: string, name: string) => {
  const [state, setState] = useRecoilState(VariableAtomFamily({ storyId, name }))
  const setValue = useCallback(
    (value: string) => {
      setState((oldState) => {
        if (oldState instanceof DefaultValue) return oldState
        return {
          ...oldState,
          tempRawValue: value
        }
      })
    },
    [setState]
  )
  return [state, setValue] as [TelleryVariable, (value: string) => void]
}
