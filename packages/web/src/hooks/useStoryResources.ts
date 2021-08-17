import { TelleryBlockAtom } from '@app/store/block'
import type { Editor } from '@app/types'
import { selectorFamily, useRecoilValue } from 'recoil'

export const StoryResourcesAtom = selectorFamily<Editor.BaseBlock[], string>({
  key: 'TelleryStoryResourcesBlocks',
  get:
    (storyId) =>
    ({ get }) => {
      const story = get(TelleryBlockAtom(storyId))
      const resourceIds = story.resources ?? []
      const resources = resourceIds.map((id) => get(TelleryBlockAtom(id)))

      return resources
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const useStoryResources = (storyId: string) => {
  const resources = useRecoilValue(StoryResourcesAtom(storyId))

  return resources
}
