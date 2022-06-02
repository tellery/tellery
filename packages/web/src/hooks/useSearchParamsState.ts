import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export const useSearchParamsState = (key: string, initValue: unknown) => {
  const [params, setParams] = useSearchParams()

  const setParamsValue = useCallback(
    (value: string) => {
      const newParams = new URLSearchParams(params)
      if (value === initValue) {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
      setParams(newParams, { replace: true })
    },
    [initValue, key, params, setParams]
  )

  return [params.get(key) ?? initValue, setParamsValue] as [string, (value: string) => void]
}
