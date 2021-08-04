import { SetStateAction, useAtom } from 'jotai'
import { atomFamily, atomWithStorage, useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

const blockLocalPreferencesAtoms = atomFamily<
  { id: string; key: string; initValue: unknown },
  any,
  SetStateAction<any>
>(
  (param) => atomWithStorage(`${param.id}:${param.key}`, param.initValue),
  (a, b) => a.id === b.id && a.key === b.key
)

export const useBlockLocalPreferences = <T>(blockId: string, key: string, initValue: T) => {
  const atom = useAtom<T, SetStateAction<T>>(blockLocalPreferencesAtoms({ id: blockId, key, initValue }))
  return atom
}

export const useSetBlockLocalPreferences = () => {
  const setValue = useAtomCallback<void, { id: string; key: string; value: unknown }>(
    useCallback((get, set, arg) => {
      set(blockLocalPreferencesAtoms({ id: arg.id, key: arg.key, initValue: arg.value }), arg.value)
    }, [])
  )
  return setValue
}

export const useGetBlockLocalPreferences = () => {
  const getValue = useAtomCallback<unknown, { id: string; key: string }>(
    useCallback((get, set, arg) => {
      return get(blockLocalPreferencesAtoms({ id: arg.id, key: arg.key, initValue: false }))
    }, [])
  )
  return getValue
}
