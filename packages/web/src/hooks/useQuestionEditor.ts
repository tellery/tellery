import { Config, Type } from '@app/components/v11n/types'
import { Editor } from '@app/types'
import { useMemo } from 'react'
import { useIsMutating } from 'react-query'
// eslint-disable-next-line camelcase
import { atomFamily, useRecoilCallback, useRecoilState, useRecoilTransaction_UNSTABLE } from 'recoil'

// export interface QuestionEditor {
//   close: (arg: string) => Promise<void>
//   open: (arg: { mode: Mode }) => Promise<void>
// }

export type QueryEditorMode = 'SQL' | 'VIS'

export interface EditorDraft {
  sql?: string
  visConfig?: Config<Type>
  snapshotId?: string
  title?: Editor.Token[]
}

type BlockDraft = Record<
  string,
  {
    storyId: string
    draft?: EditorDraft
    mode: QueryEditorMode
  }
>

export const useDraftBlockMutating = (blockId: string) => {
  const refreshingSnapshot = useIsMutating({
    predicate: (mutation) => (mutation.options.mutationKey as string) === `draft/${blockId}`
  })

  return refreshingSnapshot
}
export const questionEditorBlockMapState = atomFamily<BlockDraft, string>({
  key: 'questionEditorBlockMapState',
  default: {}
})

export const questionEditorOpenState = atomFamily<boolean, string>({ key: 'questionEditorOpenState', default: false })

export const questionEditorActiveIdState = atomFamily<string | null, string>({
  key: 'questionEditorActiveIdState',
  default: null
})

export const useQuestionEditorBlockMapState = (storyId: string) => {
  return useRecoilState(questionEditorBlockMapState(storyId))
}

export const useQuestionEditorOpenState = (storyId: string) => {
  return useRecoilState(questionEditorOpenState(storyId))
}

export const useQuestionEditorActiveIdState = (storyId: string) => {
  return useRecoilState(questionEditorActiveIdState(storyId))
}

export const useQuestionEditor = (storyId: string) => {
  const openQuestionBlockHandler = useOpenQuestionBlockIdHandler(storyId)
  const cleanQuestionEditorHandler = useCleanQuestionEditorHandler(storyId)

  return useMemo(() => {
    return {
      close: cleanQuestionEditorHandler,
      open: openQuestionBlockHandler
    }
  }, [cleanQuestionEditorHandler, openQuestionBlockHandler])
}

export const useCleanQuestionEditorHandler = (storyId: string) => {
  const handler = useRecoilCallback(
    (recoilCallback) => async (arg: string) => {
      const blockId = arg
      const blockMap = await recoilCallback.snapshot.getPromise(questionEditorBlockMapState(storyId))
      if (blockMap[blockId]) {
        recoilCallback.set(questionEditorBlockMapState(storyId), (state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [blockId]: _removed, ...rest } = state
          return rest
        })
      }
    },
    [storyId]
  )

  return handler
}

export const useOpenQuestionBlockIdHandler = (storyId: string) => {
  const handler = useRecoilTransaction_UNSTABLE(
    (recoilCallback) =>
      ({ mode, blockId }: { mode: QueryEditorMode; blockId: string; storyId: string }) => {
        recoilCallback.set(questionEditorActiveIdState(storyId), blockId)
        recoilCallback.set(questionEditorOpenState(storyId), true)
        recoilCallback.set(questionEditorBlockMapState(storyId), (state) => {
          return {
            ...state,
            [blockId]: {
              ...state[blockId],
              storyId,
              mode
            }
          }
        })
      },
    []
  )
  return handler
}
