import { StoryVisualizationBlocksAtom, TelleryBlockAtom } from '@app/store/block'
import type { Editor } from '@app/types'
import { selectorFamily, useRecoilValue } from 'recoil'

export const StoryResourcesAtom = selectorFamily<Editor.QueryBlock[], string>({
  key: 'StoryBlockResourcesAtom',
  get:
    (storyId) =>
    ({ get }) => {
      const result: Editor.VisualizationBlock[] = []
      const blocksMap = get(StoryVisualizationBlocksAtom({ storyId }))

      Object.values(blocksMap).forEach((block) => {
        const queryBlockId = block.content?.queryId
        if (queryBlockId) {
          const queryBlock = get(TelleryBlockAtom(queryBlockId))
          result.push(queryBlock as Editor.QueryBlock)
        }
      })

      return result
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const useStoryResources = (storyId: string) => {
  const resources = useRecoilValue(StoryResourcesAtom(storyId))

  return resources
}
