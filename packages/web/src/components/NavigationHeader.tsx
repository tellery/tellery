import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import {
  IconCommonLock,
  IconCommonMore,
  IconCommonStar,
  IconCommonStarFill,
  IconMenuFullWidth,
  IconMenuNormalWidth
} from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { useWorkspaceView } from '@app/hooks/api'
import React, { memo, useCallback } from 'react'
import { ThemingVariables } from '@app/styles'
import type { Story } from '@app/types'
import { useStorySnapshotManager } from '../hooks/useStorySnapshotManager'
import IconButton from './kit/IconButton'
import { RefreshButton } from './RefreshButton'
import { StoryConfigPopOver } from './StoryConfigPopOver'
import { StoryVisits } from './StoryVisits'

export const _NavigationHeader = (props: {
  story: Story
  storyId: string
  title?: string
  pinned?: boolean
  locked?: boolean
}) => {
  const { story } = props
  const { data: workspaceView, refetch: refetchWorkspaceView } = useWorkspaceView()
  const commit = useCommit()
  const blockTranscation = useBlockTranscations()
  const setStoryFormat = useCallback(
    async (key: string, value: boolean | string) => {
      const newFormat = {
        ...story?.format,
        [key]: value
      }
      await commit({
        storyId: story.id,
        transcation: createTranscation({
          operations: [{ cmd: 'update', path: ['format'], args: newFormat, table: 'block', id: story.id }]
        })
      })
    },
    [story, commit]
  )

  return (
    <div
      className={css`
        background: ${ThemingVariables.colors.gray[5]};
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 0 20px;
        align-self: flex-start;
        width: 100%;
        line-height: 0;
        flex: 0 0 44px;
        box-shadow: 0px 1px 0px ${ThemingVariables.colors.gray[1]};
        z-index: 100;
      `}
    >
      {props.locked && (
        <span
          className={css`
            display: inline-flex;
            flex: 0 0;
            align-items: center;
            justify-self: flex-start;
            margin-right: 10px;
          `}
        >
          <IconCommonLock />
          locked
        </span>
      )}
      <div
        className={css`
          flex: 1 1;
          font-size: 16px;
          line-height: 19px;
          font-weight: 400;
          color: ${ThemingVariables.colors.text[0]};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {props.title}
      </div>
      <div
        className={css`
          font-size: 0;
          display: flex;
          flex: 0 0;
          justify-self: flex-end;
          justify-content: flex-end;
          align-items: center;
          margin-left: 10px;
        `}
      >
        <StoryVisits storyId={props.storyId} />
        <div
          className={css`
            height: 24px;
            margin: 0 20px;
            border-right: solid 1px ${ThemingVariables.colors.gray[1]};
          `}
        />
        <RefreshAllQuestionBlockButton storyId={props.storyId} />

        <IconButton
          hoverContent={story.format?.fullWidth ? 'Dsiable Full Width' : 'Full Width'}
          icon={story.format?.fullWidth ? IconMenuNormalWidth : IconMenuFullWidth}
          color={ThemingVariables.colors.text[0]}
          className={css`
            margin-right: 20px;
          `}
          onClick={() => {
            setStoryFormat('fullWidth', !story.format?.fullWidth)
          }}
        />
        {props.pinned ? (
          <IconButton
            hoverContent={'Favorite'}
            icon={IconCommonStarFill}
            onClick={async () => {
              if (!workspaceView) {
                return
              }
              await blockTranscation.unpinStory(workspaceView.id, props.storyId)
              refetchWorkspaceView()
            }}
          />
        ) : (
          <IconButton
            hoverContent={'Favorite'}
            icon={IconCommonStar}
            color={ThemingVariables.colors.text[0]}
            onClick={async () => {
              if (!workspaceView) {
                return
              }
              await blockTranscation.pinStory(workspaceView.id, props.storyId)
              refetchWorkspaceView()
            }}
          />
        )}
        {story && (
          <Tippy
            content={<StoryConfigPopOver story={story} />}
            hideOnClick={true}
            theme="tellery"
            animation="fade"
            duration={150}
            arrow={false}
            interactive
            trigger="click"
            popperOptions={{
              modifiers: [
                {
                  name: 'offset',
                  enabled: true,
                  options: {
                    offset: [10, 20]
                  }
                }
              ]
            }}
          >
            <IconButton
              icon={IconCommonMore}
              color={ThemingVariables.colors.text[0]}
              className={css`
                margin-left: 20px;
              `}
            />
          </Tippy>
        )}
      </div>
    </div>
  )
}

export const RefreshAllQuestionBlockButton: React.FC<{ storyId: string }> = () => {
  const storySnapshotManger = useStorySnapshotManager()

  if (storySnapshotManger.total <= 0) return null
  return (
    <div
      className={css`
        width: 20px;
        height: 20px;
        display: flex;
        margin-right: 20px;
        align-items: center;
        justify-content: center;
      `}
    >
      <Tippy
        content={
          storySnapshotManger.mutating !== 0
            ? `Refreshing... ${storySnapshotManger.mutating}/${storySnapshotManger.total}, click to stop`
            : `Refresh ${storySnapshotManger.total} Questions`
        }
        hideOnClick={false}
        animation="fade"
        duration={150}
        arrow={false}
      >
        <RefreshButton
          color={ThemingVariables.colors.text[0]}
          loading={storySnapshotManger.mutating !== 0}
          onClick={storySnapshotManger.mutating !== 0 ? storySnapshotManger.cancelAll : storySnapshotManger.runAll}
        />
      </Tippy>
    </div>
  )
}

export const NavigationHeader = memo(_NavigationHeader)
