import { useRouteMatch } from 'react-router-dom'

export const useStoryPathParams = () => {
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')
  const storyId = matchStory?.params.id
  return storyId
}
