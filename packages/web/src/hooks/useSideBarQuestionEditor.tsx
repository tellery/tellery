import { useMemo, useCallback } from 'react'
import { atomFamily, useRecoilState, useSetRecoilState } from 'recoil'

export const useSideBarQuestionEditor = (storyId: string) => {
  const setSideBarQuestionEditorState = useSetSideBarQuestionEditorState(storyId)
  const open = useCallback(
    ({ blockId, activeTab }: { blockId: string; activeTab: string }) => {
      setSideBarQuestionEditorState({ blockId, activeTab })
    },
    [setSideBarQuestionEditorState]
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
