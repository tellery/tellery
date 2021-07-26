import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useWorkspaceView } from '@app/hooks/api'
import { css } from '@emotion/css'
import React from 'react'
import ContentLoader from 'react-content-loader'
import { useRouteMatch } from 'react-router-dom'
import { useGetBlockTitleTextSnapshot } from './editor'
import { MainSideBarItem } from './MainSideBarItem'
import { SideBarContentLayout } from './SideBarContentLayout'

const SideBarLoader: React.FC = () => {
  return (
    <ContentLoader viewBox="0 0 210 36" style={{ width: '100%', height: '36px', padding: '0 8px' }}>
      <rect x="0" y="0" rx="5" ry="5" width="210" height="36" />
    </ContentLoader>
  )
}

export const SideBarPinnedStoriesSection = () => {
  const { data: workspaceView } = useWorkspaceView()

  return (
    <SideBarContentLayout title={'Pinned Stories'}>
      {workspaceView?.pinnedList && <WorkspaceItems storyIds={workspaceView?.pinnedList} />}
    </SideBarContentLayout>
  )
}

const WorkspaceItems: React.FC<{ storyIds: string[] }> = ({ storyIds }) => {
  return (
    <div
      className={css`
        padding: 10px 16px 0;
      `}
    >
      {storyIds.map((storyId) => (
        <React.Suspense key={storyId} fallback={<SideBarLoader />}>
          <StoryItem blockId={storyId} />
        </React.Suspense>
      ))}
    </div>
  )
}

const StoryItem: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense(blockId)
  const openStory = useOpenStory()
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')

  return (
    <MainSideBarItem
      onClick={(e) => {
        openStory(block.id, { isAltKeyPressed: e.altKey })
      }}
      showTitle
      title={getBlockTitle(block)}
      active={matchStory?.params.id === block.id}
    ></MainSideBarItem>
  )
}
