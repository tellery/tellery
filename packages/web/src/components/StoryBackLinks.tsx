import { StoryBackwardsRefs } from '@app/components/StoryBackwardsRefs'
import { useStoryBackLinks } from '@app/hooks/api'
import React, { memo } from 'react'

const _StoryBackLinks = (props: { storyId: string }) => {
  const { data: backLinks } = useStoryBackLinks(props.storyId)
  if (!backLinks?.backwardRefs || backLinks?.backwardRefs?.length === 0) return null
  return (
    <React.Suspense fallback={<div>loading...</div>}>
      <StoryBackwardsRefs refs={backLinks?.backwardRefs} storyId={props.storyId} />
    </React.Suspense>
  )
}
export const StoryBackLinks = memo(_StoryBackLinks)
