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
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { ThemingVariables } from '@app/styles'
import { PopoverMotionVariants } from '@app/styles/animations'
import type { Story } from '@app/types'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react/headless'
import { dequal } from 'dequal'
import { useAnimation, useSpring } from 'framer-motion'
import React, { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Props } from 'tippy.js'
import { useStorySnapshotManagerProvider } from '../hooks/useStorySnapshotManager'
import IconButton from './kit/IconButton'
import { RefreshButton } from './RefreshButton'
import { StoryConfigPopOver } from './StoryConfigPopOver'
import { StoryVisits } from './StoryVisits'

export const _NavigationHeader = (props: {
  storyId: string
  title?: string
  pinned?: boolean
  format: Story['format']
}) => {
  const locked = !!props.format?.locked
  const { data: workspaceView, refetch: refetchWorkspaceView } = useWorkspaceView()
  const commit = useCommit()
  const blockTranscation = useBlockTranscations()
  const setStoryFormat = useCallback(
    async (key: string, value: boolean | string) => {
      const newFormat = {
        ...props.format,
        [key]: value
      }
      await commit({
        storyId: props.storyId,
        transcation: createTranscation({
          operations: [{ cmd: 'update', path: ['format'], args: newFormat, table: 'block', id: props.storyId }]
        })
      })
    },
    [props.format, props.storyId, commit]
  )
  const permissions = useStoryPermissions(props.storyId)

  return (
    <>
      {locked && (
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
        {permissions.canWrite && (
          <>
            <RefreshAllQuestionBlockButton storyId={props.storyId} />
            <IconButton
              hoverContent={props.format?.fullWidth ? 'Dsiable Full Width' : 'Full Width'}
              icon={props.format?.fullWidth ? IconMenuNormalWidth : IconMenuFullWidth}
              color={ThemingVariables.colors.text[0]}
              className={css`
                margin-right: 20px;
              `}
              onClick={() => {
                setStoryFormat('fullWidth', !props.format?.fullWidth)
              }}
            />
          </>
        )}

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
        {props.storyId && <StoryConfigButton storyId={props.storyId} />}
      </div>
    </>
  )
}

const StoryConfigButton: React.FC<{ storyId: string }> = ({ storyId }) => {
  const controls = useAnimation()

  const onMount = useCallback(() => {
    controls.mount()
    controls.start(PopoverMotionVariants.active)
  }, [controls])

  const onHide = useCallback(() => {
    controls.start(PopoverMotionVariants.inactive)
  }, [controls])

  return (
    <Tippy
      render={(attrs) => <StoryConfigPopOver storyId={storyId} animate={controls} {...attrs} />}
      hideOnClick={true}
      theme="tellery"
      animation={true}
      onMount={onMount}
      onHide={onHide}
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
  )
}

export const RefreshAllQuestionBlockButton: React.FC<{ storyId: string }> = ({ storyId }) => {
  const storySnapshotManger = useStorySnapshotManagerProvider(storyId)
  const { t } = useTranslation()
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
      <RefreshButton
        hoverContent={
          storySnapshotManger.mutating !== 0
            ? t(`Refreshing... {{mutatingCount}} / {{totalCount}}, click to stop`, {
                mutatingCount: storySnapshotManger.mutating,
                totalCount: storySnapshotManger.total
              })
            : t('Refresh {{count}} query', { count: storySnapshotManger.total })
        }
        color={ThemingVariables.colors.text[0]}
        loading={storySnapshotManger.mutating !== 0}
        onClick={storySnapshotManger.mutating !== 0 ? storySnapshotManger.cancelAll : storySnapshotManger.runAll}
      />
    </div>
  )
}

export const NavigationHeader = memo(_NavigationHeader, (a, b) => dequal(a, b))
