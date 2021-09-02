import { useOpenStory } from '@app/hooks'
import { useStoriesSearch, useWorkspaceView } from '@app/hooks/api'
import { useStoryPathParams } from '@app/hooks/useStoryPathParams'
import { ThemingVariables } from '@app/styles'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Avatar from './Avatar'
import { CircularLoading } from './CircularLoading'
import { useGetBlockTitleTextSnapshot } from './editor'
import { NewStoryButton } from './NewStoryButton'
import { SearchInput } from './SearchInput'
import { SideBarContentLayout } from './SideBarContentLayout'
import type { StoryListItemValue } from './StoryListItem'

export const SideBarAllStoriesSection = () => {
  const { t } = useTranslation()
  const { data: workspaceView } = useWorkspaceView()
  const [keyword, setKeyword] = useState('')
  const { data, fetchNextPage, status, hasNextPage, isLoading, isFetchingNextPage } = useStoriesSearch(keyword)
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const items = useMemo<StoryListItemValue[]>(
    () =>
      data?.pages
        .map(({ results }) =>
          results.searchResults.map((storyId) => {
            const story = results.blocks[storyId]
            const block = story.children?.find((id) => results.highlights[id])
            const highlight = Object.entries(results.highlights).find(
              ([id]) => results.blocks[id].storyId === storyId && id !== storyId
            )
            return {
              id: story.id,
              title: results.highlights[story.id].trim().length ? results.highlights[story.id] : DEFAULT_TITLE,
              originTitle: getBlockTitle(story),
              updatedAt: story.updatedAt,
              highlight: block
                ? {
                    id: block,
                    text: results.highlights[block],
                    originText: getBlockTitle(results.blocks[block])
                  }
                : highlight
                ? {
                    id: highlight[0],
                    text: highlight[1],
                    originText: getBlockTitle(results.blocks[highlight[0]])
                  }
                : undefined,
              user: results.users[story.createdById!],
              relatedStories: results.links[storyId].map((id) => results.blocks[id]),
              isPinned: !!workspaceView?.pinnedList.includes(storyId)
            }
          })
        )
        .flat() || [],
    [data?.pages, getBlockTitle, workspaceView?.pinnedList]
  )

  return (
    <SideBarContentLayout title={t(`Stories`)}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <div
          className={css`
            display: flex;
            margin: 0 8px;
            > * + * {
              margin-left: 8px;
            }
          `}
        >
          <SearchInput
            placeholder={t`Search`}
            onChange={(e) => {
              setKeyword(e.target.value)
            }}
          />
          <NewStoryButton
            classname={css`
              background: #ffffff;
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              box-sizing: border-box;
              border-radius: 8px;
              height: 36px;
              width: 36px;
              display: flex;
              justify-content: center;
              align-items: center;
              cursor: pointer;
            `}
          />
        </div>
        <PerfectScrollbar
          className={css`
            flex: 1;
            margin-top: 8px;
            overflow-y: auto;
            min-height: 40%;
          `}
          options={{ suppressScrollX: true }}
          onScroll={(e) => {
            if (
              hasNextPage &&
              status !== 'loading' &&
              e.currentTarget.clientHeight + e.currentTarget.scrollTop + 100 >= e.currentTarget.scrollHeight
            ) {
              fetchNextPage()
            }
          }}
        >
          {items && <StoryCards items={items} />}
          <div
            className={css`
              padding: 0 8px;
              margin-top: 10px;
              margin-bottom: 200px;
              text-align: center;
            `}
          >
            {(isLoading || isFetchingNextPage) && (
              <CircularLoading size={20} color={ThemingVariables.colors.primary[1]} />
            )}
          </div>
        </PerfectScrollbar>
      </div>
    </SideBarContentLayout>
  )
}

export const StoryCard: React.FC<{ data: StoryListItemValue }> = ({ data }) => {
  const openStory = useOpenStory()
  const storyId = useStoryPathParams()
  const isActive = storyId === data.id

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
        openStory(data.id, { blockId: data.highlight?.id })
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
            color: ${ThemingVariables.colors.text[0]};
            overflow: hidden;
            width: 100%;
            word-break: break-all;
            -webkit-line-clamp: 2;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            text-overflow: ellipsis;
            min-height: 34px;
          `}
          dangerouslySetInnerHTML={{ __html: data.title }}
        ></div>
        {data.highlight && (
          <div
            className={css`
              font-size: 14px;
              line-height: 17px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              color: ${ThemingVariables.colors.text[1]};
              margin-top: 5px;
            `}
            dangerouslySetInnerHTML={{ __html: data.highlight.text }}
          ></div>
        )}
      </div>

      <div
        className={css`
          display: flex;
          align-items: center;
          margin-top: 10px;
          overflow: hidden;
        `}
      >
        {data.user && (
          <div
            className={css`
              flex-shrink: 1;
              display: flex;
              align-items: center;
              margin-right: 5px;
              overflow: hidden;
            `}
          >
            <Avatar
              src={data.user.avatar}
              email={data.user.email}
              size={14}
              className={css`
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
                white-space: nowrap;
              `}
            >
              {data.user?.name}
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
          {dayjs(data.updatedAt).format('YYYY.MM.DD')}
        </div>
      </div>
    </div>
  )
}

const StoryCards: React.FC<{ items: StoryListItemValue[] }> = ({ items }) => {
  return (
    <div
      className={css`
        padding-top: 8px;
        padding: 0 8px 0px;
        > * + * {
          margin-top: 10px;
        }
      `}
    >
      {items.map((item) => (
        <StoryCard data={item} key={item.id} />
      ))}
    </div>
  )
}
