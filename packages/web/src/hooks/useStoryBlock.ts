import { TelleryStoryBlocks } from '@app/store/block'
import type { Editor, Story, Thought } from '@app/types'
import { useEffect, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { useFetchStoryChunk } from './api'

export const useStoryBlocksMap = (storyId: string) => {
  const [state, setState] = useState<Record<string, Editor.BaseBlock> | undefined>()

  useEffect(() => {
    setState(undefined)
  }, [storyId])

  useFetchStoryChunk<Story | Thought>(storyId)

  const value = useRecoilValueLoadable(TelleryStoryBlocks(storyId))

  useEffect(() => {
    if (value.state === 'hasValue') {
      setState(value.contents)
    }
  }, [value.contents, value.state, storyId])

  return state?.[storyId] ? state : undefined
}
