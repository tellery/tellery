import { useCallback, useMemo } from 'react'
import { atomFamily, useRecoilState, useSetRecoilState } from 'recoil'
import { useSetRightSideBarUIConfig } from './useRightSideBarConfig'

export const useSideBarQuestionEditor = (storyId: string) => {
  const setSideBarRightState = useSetSideBarRightState(storyId)
  const setRightSideBarUIConfig = useSetRightSideBarUIConfig()
  const open = useCallback(
    ({ blockId, activeTab }: { blockId: string; activeTab: 'Visualization' | 'Modeling' | 'Query' }) => {
      setSideBarRightState({ type: 'Question', data: { blockId, activeTab } })
      setRightSideBarUIConfig((state) => ({ ...state, folded: false }))
    },
    [setRightSideBarUIConfig, setSideBarRightState]
  )
  const close = useCallback(() => {
    setSideBarRightState(null)
  }, [setSideBarRightState])

  return useMemo(
    () => ({
      open,
      close
    }),
    [close, open]
  )
}

export const useSideBarVariableEditor = (storyId: string) => {
  const setSideBarRightState = useSetSideBarRightState(storyId)
  const setRightSideBarUIConfig = useSetRightSideBarUIConfig()
  const open = useCallback(
    ({ blockId, activeTab }: { blockId: string; activeTab: 'Variable' | 'Help' }) => {
      setSideBarRightState({ type: 'Variable', data: { blockId, activeTab } })
      setRightSideBarUIConfig((state) => ({ ...state, folded: false }))
    },
    [setRightSideBarUIConfig, setSideBarRightState]
  )
  const close = useCallback(() => {
    setSideBarRightState(null)
  }, [setSideBarRightState])

  return useMemo(
    () => ({
      open,
      close
    }),
    [close, open]
  )
}

export const SideBarRightAtom = atomFamily<
  {
    type: 'Question' | 'Variable' | 'DataAssets'
    data: { blockId: string; activeTab: string }
  } | null,
  string
>({
  default: null,
  key: 'SideBarRightAtom'
})

export const useSetSideBarRightState = (storyId: string) => {
  return useSetRecoilState(SideBarRightAtom(storyId))
}

export const useSideBarRightState = (storyId: string) => {
  return useRecoilState(SideBarRightAtom(storyId))
}
