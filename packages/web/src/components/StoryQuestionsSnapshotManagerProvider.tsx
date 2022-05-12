import { StorySnapshotMangerContext, useStorySnapshotManagerProvider } from '@app/hooks/useStorySnapshotManager'
import React from 'react'

export const StoryQuestionsSnapshotManagerProvider: ReactFCWithChildren<{ storyId: string }> = ({
  children,
  storyId
}) => {
  const blockTransctionValue = useStorySnapshotManagerProvider(storyId)
  return (
    <StorySnapshotMangerContext.Provider value={blockTransctionValue}>{children}</StorySnapshotMangerContext.Provider>
  )
}
