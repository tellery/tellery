import { isQueryBlock } from '@app/components/editor/Blocks/utils'
import { TelleryStoryBlocks } from '@app/store/block'
import type { Editor } from '@app/types'
import { selectorFamily, useRecoilValue } from 'recoil'

export const StoryResourcesAtom = selectorFamily<Editor.QueryBlock[], string>({
  key: 'StoryBlockResourcesAtom',
  get:
    (storyId) =>
    ({ get }) => {
      const result: Editor.VisualizationBlock[] = []
      const blocksMap = get(TelleryStoryBlocks(storyId))

      Object.values(blocksMap).forEach((block) => {
        const currentNode = block
        if (isQueryBlock(block.type)) {
          result.push(currentNode as Editor.VisualizationBlock)
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
