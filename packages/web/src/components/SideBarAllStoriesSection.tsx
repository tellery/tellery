import { IconCommonSearch } from '@app/assets/icons'
import { useOpenStory } from '@app/hooks'
import { useStoriesSearch, useWorkspaceView } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { CircularLoading } from './CircularLoading'
import { useGetBlockTitleTextSnapshot } from './editor'
import { SideBarContentLayout } from './SideBarContentLayout'
import type { StoryListItemValue } from './StoryListItem'

export const SideBarAllStoriesSection = () => {
  const { data: workspaceView } = useWorkspaceView()
  const [keyword, setKeyword] = useState('')
  const { data, fetchNextPage, refetch, status, hasNextPage, isLoading } = useStoriesSearch(keyword)
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
    <SideBarContentLayout title={'All Stories'}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <SideBarSearch
          placeholder="Search"
          onChange={(e) => {
            setKeyword(e.target.value)
          }}
        />
        <div
          className={css`
            overflow-y: auto;
            min-height: 40%;
          `}
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
              padding: 0 16px;
              margin-top: 10px;
              margin-bottom: 200px;
              text-align: center;
            `}
          >
            {isLoading && <CircularLoading size={20} color={ThemingVariables.colors.primary[0]} />}
          </div>
        </div>
      </div>
    </SideBarContentLayout>
  )
}

export const StoryCard: React.FC<{ data: StoryListItemValue }> = ({ data }) => {
  const openStory = useOpenStory()
  return (
    <div
      className={css`
        background: #ffffff;
        border-radius: 10px;
        cursor: pointer;
        padding: 10px;
        &:hover {
          background: ${ThemingVariables.colors.primary[5]};
          border-radius: 10px;
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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: ${ThemingVariables.colors.text[0]};
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
              margin-top: 10px; ;
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
        `}
      >
        {data.user && (
          <div
            className={css`
              flex-shrink: 0;
              display: flex;
              align-items: center;
            `}
          >
            <img
              src={data.user?.avatar}
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
        padding-top: 10px;
        padding: 10px 16px 0px;
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

const SideBarSearch: React.FC<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>> =
  (props) => {
    return (
      <div
        className={css`
          position: relative;
          margin: 0 16px;
        `}
      >
        <input
          {...props}
          className={css`
            flex-shrink: 0;
            width: 100%;
            height: 30px;
            background: ${ThemingVariables.colors.gray[5]};
            border: 1px solid ${ThemingVariables.colors.gray[1]};
            outline: none;
            box-sizing: border-box;
            border-radius: 8px;
            padding: 0 15px;

            &::placeholder {
              font-size: 16px;
              color: ${ThemingVariables.colors.gray[0]};
            }
          `}
        ></input>
        <IconCommonSearch
          fill={ThemingVariables.colors.gray[0]}
          className={css`
            position: absolute;
            right: 10px;
            z-index: 999;
            top: 50%;
            color: ${ThemingVariables.colors.gray[0]};
            display: inline-block;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
          `}
        />
      </div>
    )
  }
