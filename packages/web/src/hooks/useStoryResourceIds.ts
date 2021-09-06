import { BlockResourcesAtom } from '@app/store/block'
import { useRecoilValue } from 'recoil'

export const useStoryResourceIds = (storyId: string) => {
  const resources = useRecoilValue(BlockResourcesAtom(storyId))

  return resources
}
