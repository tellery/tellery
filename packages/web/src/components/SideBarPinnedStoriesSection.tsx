import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useUser, useWorkspaceView } from '@app/hooks/api'
import { useStoryPathParams } from '@app/hooks/useStoryPathParams'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React from 'react'
import ContentLoader from 'react-content-loader'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useGetBlockTitleTextSnapshot } from './editor'
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
    <SideBarContentLayout title={'Favorites'}>
      {workspaceView?.pinnedList && <WorkspaceItems storyIds={workspaceView?.pinnedList} />}
    </SideBarContentLayout>
  )
}

const WorkspaceItems: React.FC<{ storyIds: string[] }> = ({ storyIds }) => {
  return (
    <PerfectScrollbar
      className={css`
        flex: 1;
        overflow-y: auto;
        padding: 10px 8px 50px;
        > * + * {
          margin-top: 10px;
        }
      `}
      options={{ suppressScrollX: true }}
    >
      <div>
        {storyIds.map((storyId) => (
          <React.Suspense key={storyId} fallback={<SideBarLoader />}>
            <StoryCard blockId={storyId} />
          </React.Suspense>
        ))}
      </div>
    </PerfectScrollbar>
  )
}

export const StoryCard: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense(blockId)
  const openStory = useOpenStory()
  const { data: user } = useUser(block.createdById ?? null)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const storyId = useStoryPathParams()
  const isActive = storyId === blockId

  return (
    <div
      data-active={isActive}
      className={css`
        background: #ffffff;
        border-radius: 10px;
        cursor: pointer;
        padding: 10px;
        border-width: 2px;
        border-color: transparent;
        border-style: solid;
        border-radius: 10px;
        &:hover {
          border-color: ${ThemingVariables.colors.primary[3]};
        }
        &[data-active='true'] {
          border-color: ${ThemingVariables.colors.primary[2]};
        }
      `}
      onClick={() => {
        openStory(block.id)
      }}
    >
      <div
        className={css`
          & em {
            font-style: normal;
            border-radius: 2px;
            background-color: ${ThemingVariables.colors.primary[3]};
          }
        `}
      >
        <div
          className={css`
            font-weight: 500;
            font-size: 14px;
            line-height: 17px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: ${ThemingVariables.colors.text[0]};
            -webkit-line-clamp: 2;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            text-overflow: ellipsis;
            min-height: 34px;
          `}
        >
          {getBlockTitle(block)}
        </div>
      </div>

      <div
        className={css`
          display: flex;
          align-items: center;
          margin-top: 10px;
          overflow: hidden;
        `}
      >
        {user && (
          <div
            className={css`
              flex-shrink: 1;
              display: flex;
              align-items: center;
              margin-right: 5px;
              overflow: hidden;
            `}
          >
            <img
              src={user?.avatar}
              className={css`
                height: 14px;
                width: 14px;
                border-radius: 50%;
                background-color: #fff;
                margin-right: 3px;
              `}
            />
            <span
              className={css`
                font-size: 12px;
                line-height: 14px;
                text-align: center;
                color: ${ThemingVariables.colors.text[1]};
                text-overflow: ellipsis;
                overflow: hidden;
              `}
            >
              {user?.name}
            </span>
          </div>
        )}
        <div
          className={css`
            margin-left: auto;
            font-weight: normal;
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[2]};
          `}
        >
          {dayjs(block.updatedAt).format('YYYY.MM.DD')}
        </div>
      </div>
    </div>
  )
}
