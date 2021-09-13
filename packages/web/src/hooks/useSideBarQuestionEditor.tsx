import { useCallback, useMemo } from 'react'
import { atomFamily, useRecoilState, useSetRecoilState } from 'recoil'
import { useSetRightSideBarConfig } from './useRightSideBarConfig'

export const useSideBarQuestionEditor = (storyId: string) => {
  const setSideBarQuestionEditorState = useSetSideBarQuestionEditorState(storyId)
  const setRightSideBarState = useSetRightSideBarConfig()
  const open = useCallback(
    ({ blockId, activeTab }: { blockId: string; activeTab: string }) => {
      setSideBarQuestionEditorState({ blockId, activeTab })
      setRightSideBarState((state) => ({ ...state, folded: false }))
    },
    [setRightSideBarState, setSideBarQuestionEditorState]
  )
  const close = useCallback(() => {
    setSideBarQuestionEditorState(null)
  }, [setSideBarQuestionEditorState])

  return useMemo(
    () => ({
      open,
      close
    }),
    [close, open]
  )
}

export const SideBarQuestionEditorAtom = atomFamily<{ blockId: string; activeTab: string } | null, string>({
  default: null,
  key: 'SideBarQuestionEditorAtom'
})

export const useSetSideBarQuestionEditorState = (storyId: string) => {
  return useSetRecoilState(SideBarQuestionEditorAtom(storyId))
}

export const useSideBarQuestionEditorState = (storyId: string) => {
  return useRecoilState(SideBarQuestionEditorAtom(storyId))
}
