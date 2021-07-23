import { css, cx } from '@emotion/css'
import dayjs from 'dayjs'
import { take } from 'lodash'
import React, { CSSProperties, useRef } from 'react'
import { IconCommonStar, IconCommonStarFill, IconMenuDelete } from '@app/assets/icons'
import { BlockTitle, useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { ThemingVariables } from '@app/styles'
import type { Editor, UserInfo } from '@app/types'
import { Link } from 'react-router-dom'
import IconButton from './kit/IconButton'

export type StoryListItemValue = {
  id: string
  title: string
  originTitle: string
  updatedAt: number
  highlight?: { id: string; text: string; originText: string }
  user?: UserInfo
  relatedStories: Editor.BaseBlock[]
  isPinned: boolean
}

export function StoryListItem(props: {
  value: StoryListItemValue
  style?: CSSProperties
  large?: boolean
  width: number
  onStarClicked(): void
  onTrashClicked(): void
}) {
  const relatedStoriesLength = props.large ? 3 : 2
  const ref = useRef<HTMLDivElement>(null)

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  return (
    <div
      ref={ref}
      className={cx(
        css`
          width: 100%;
          padding: 0 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;

          &:hover {
            box-shadow: none;
            background-color: ${ThemingVariables.colors.gray[5]};
          }
        `
      )}
      style={props.style}
    >
      <div
        className={css`
          height: 92px;
          display: flex;

          &:hover {
            background: ${ThemingVariables.colors.primary[5]};
            border-radius: 10px;
          }

          & > div {
            height: 100%;
            padding: 0 15px;
            display: flex;
          }
        `}
        style={{ height: props.large ? 92 : 60 }}
      >
        <div
          className={css`
            width: 0;
            flex: 1;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
          `}
        >
          <Link
            to={`/story/${props.value.id}`}
            className={css`
              text-decoration: none;
              max-width: 100%;
              display: flex;
              flex-direction: column;
            `}
          >
            <span
              className={css`
                font-size: 16px;
                line-height: 20px;
                color: ${ThemingVariables.colors.text[0]};
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                word-break: break-word;
                & > em {
                  font-style: normal;
                  border-radius: 2px;
                  background-color: ${ThemingVariables.colors.primary[3]};
                }
              `}
              title={props.value.originTitle}
              dangerouslySetInnerHTML={{ __html: props.value.title }}
            />
          </Link>
          {props.large && props.value.highlight ? (
            <Link
              to={`/story/${props.value.id}#${props.value.highlight.id}`}
              className={css`
                text-decoration: none;
                max-width: 100%;
                display: flex;
                flex-direction: column;
              `}
            >
              <span
                className={css`
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[1]};
                  font-weight: 400;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  -webkit-line-clamp: 2;
                  display: -webkit-box;
                  -webkit-box-orient: vertical;
                  white-space: nowrap;
                  word-break: break-word;
                  & > em {
                    font-style: normal;
                    border-radius: 2px;
                    background-color: ${ThemingVariables.colors.primary[3]};
                  }
                `}
                title={props.value.highlight.originText}
                dangerouslySetInnerHTML={{ __html: props.value.highlight.text }}
              />
            </Link>
          ) : null}
        </div>
        <div
          className={css`
            width: 200px;
            align-items: center;
            justify-content: flex-start;
          `}
        >
          {props.value.user ? (
            <>
              <img
                src={props.value.user.avatar}
                width={24}
                height={24}
                className={css`
                  object-fit: cover;
                  border-radius: 12px;
                  overflow: hidden;
                  margin-right: 4px;
                `}
              />
              <span
                className={css`
                  font-size: 14px;
                  line-height: 20px;
                  text-align: center;
                  padding: 0 1px;
                  color: ${ThemingVariables.colors.text[0]};
                `}
              >
                {props.value.user.name}
              </span>
            </>
          ) : null}
        </div>
        {props.width >= 960 ? (
          <div
            className={css`
              width: 200px;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;

              & > a + a {
                margin-top: 5px;
              }
            `}
          >
            {take(
              props.value.relatedStories,
              props.value.relatedStories.length === relatedStoriesLength
                ? relatedStoriesLength
                : relatedStoriesLength - 1
            ).map((story) => (
              <Link
                key={story.id}
                to={`/story/${story.id}`}
                className={css`
                  text-decoration: none;
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[0]};
                  text-align: center;
                  max-width: 100%;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
                title={getBlockTitle(story)}
              >
                <BlockTitle block={story} />
              </Link>
            ))}
            {props.value.relatedStories.length > relatedStoriesLength ? (
              <span
                className={css`
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[1]};
                  margin-top: 5px;
                `}
              >
                and {props.value.relatedStories.length - (relatedStoriesLength - 1)} more
              </span>
            ) : null}
          </div>
        ) : null}
        {props.width >= 1100 ? (
          <div
            className={css`
              width: 150px;
              flex-direction: column;
              justify-content: center;
            `}
          >
            <span
              className={css`
                font-size: 14px;
                line-height: 17px;
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              {dayjs(props.value.updatedAt).format('YYYY-MM-DD')}
            </span>
            {props.large ? (
              <span
                className={css`
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[1]};
                  margin-top: 5px;
                `}
              >
                {dayjs(props.value.updatedAt).format('HH:mm')}
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          className={css`
            width: 90px;
            align-items: center;
            justify-content: flex-start;

            & > svg {
              cursor: pointer;
            }
          `}
        >
          {props.value.isPinned ? (
            <IconButton icon={IconCommonStarFill} onClick={props.onStarClicked} />
          ) : (
            <IconButton icon={IconCommonStar} color={ThemingVariables.colors.gray[0]} onClick={props.onStarClicked} />
          )}
          <IconButton
            icon={IconMenuDelete}
            color={ThemingVariables.colors.gray[0]}
            className={css`
              margin-left: 20px;
            `}
            onClick={props.onTrashClicked}
          />
        </div>
      </div>
    </div>
  )
}
