import { StoryQueryVisualizationBlocksAtom } from '@app/store/block'
import { useRecoilValue } from 'recoil'

export const useStoryQueryVisualizations = (storyId: string, queryId: string) => {
  const Visualizations = useRecoilValue(StoryQueryVisualizationBlocksAtom({ storyId, queryId }))

  return Visualizations
}
