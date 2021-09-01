import { StoryQueryVisulizationBlocksAtom } from '@app/store/block'
import { useRecoilValue } from 'recoil'

export const useStoryQueryVisulizations = (storyId: string, queryId: string) => {
  const Visulizations = useRecoilValue(StoryQueryVisulizationBlocksAtom({ storyId, queryId }))

  return Visulizations
}
