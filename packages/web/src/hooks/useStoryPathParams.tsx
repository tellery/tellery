import { useMatch } from 'react-router-dom'

export const useStoryPathParams = () => {
  const matchStory = useMatch('/story/:id')
  const storyId = matchStory?.params.id
  return storyId
}
