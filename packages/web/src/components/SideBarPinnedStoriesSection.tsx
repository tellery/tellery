import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useWorkspaceView } from '@app/hooks/api'
import { useStoryPathParams } from '@app/hooks/useStoryPathParams'
import { css } from '@emotion/css'
import React from 'react'
import ContentLoader from 'react-content-loader'
import PerfectScrollbar from 'react-perfect-scrollbar'
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
    <PerfectScrollbar
      className={css`
        flex: 1;
        margin-top: 20px;
        overflow-y: auto;
        padding: 10px 16px 50px;
      `}
      options={{ suppressScrollX: true }}
    >
      {storyIds.map((storyId) => (
        <React.Suspense key={storyId} fallback={<SideBarLoader />}>
          <StoryItem blockId={storyId} />
        </React.Suspense>
      ))}
    </PerfectScrollbar>
  )
}

const StoryItem: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense(blockId)
  const openStory = useOpenStory()
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const storyId = useStoryPathParams()

  return (
    <MainSideBarItem
      onClick={(e) => {
        openStory(block.id, { isAltKeyPressed: e.altKey })
      }}
      showTitle
      title={getBlockTitle(block)}
      active={storyId === block.id}
    ></MainSideBarItem>
  )
}
