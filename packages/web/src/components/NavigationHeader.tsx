import {
  IconCommonLock,
  IconCommonMore,
  IconCommonSidebar,
  IconCommonStar,
  IconCommonStarFill,
  IconMenuFullWidth,
  IconMenuNormalWidth,
  IconMenuShow
} from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { useMediaQuery } from '@app/hooks'
import { useWorkspaceView } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { useRightSideBarConfig } from '@app/hooks/useRightSideBarConfig'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { breakpoints, ThemingVariables } from '@app/styles'
import { Editor, Story } from '@app/types'
import { DEFAULT_TIPPY_DELAY } from '@app/utils'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { dequal } from 'dequal'
import React, { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useStorySnapshotManagerProvider } from '../hooks/useStorySnapshotManager'
import IconButton from './kit/IconButton'
import { RefreshButton } from './RefreshButton'
import { StoryConfigPopOver } from './StoryConfigPopOver'
import { StoryVisits } from './StoryVisits'
import { TippySingletonContextProvider } from './TippySingletonContextProvider'

const StoryTitle: React.FC<{ storyId: string; title?: string }> = (props) => {
  const permissions = useStoryPermissions(props.storyId)

  return (
    <>
      <TippySingletonContextProvider placement="bottom" arrow={false}>
        {permissions.locked && (
          <Tippy content="Locked" placement="bottom" delay={DEFAULT_TIPPY_DELAY}>
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
            </span>
          </Tippy>
        )}
        {permissions.isPrivate && (
          <Tippy content="Private" placement="bottom" delay={DEFAULT_TIPPY_DELAY}>
            <span
              className={css`
                display: inline-flex;
                flex: 0 0;
                align-items: center;
                justify-self: flex-start;
                margin-right: 10px;
              `}
            >
              <IconMenuShow />
            </span>
          </Tippy>
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
      </TippySingletonContextProvider>
    </>
  )
}

const ThoughtTitle = () => {
  return (
    <div
      className={css`
        flex: 1;
      `}
    >
      Thought
    </div>
  )
}

const SidebarButton = () => {
  const [rightSideBarState, setRightSideBarState] = useRightSideBarConfig()

  return (
    <IconButton
      hoverContent={rightSideBarState.folded ? 'Open sidebar' : 'Close sidebar'}
      icon={IconCommonSidebar}
      onClick={async () => {
        setRightSideBarState((oldState) => ({ ...oldState, folded: !oldState.folded }))
      }}
    />
  )
}

export const _NavigationHeader = (props: {
  storyId: string
  title?: string
  pinned?: boolean
  format: Story['format']
  type: Editor.BlockType
}) => {
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
  const isSmallScreen = useMediaQuery(`only screen and (max-width: ${breakpoints[1]}px)`)

  return (
    <>
      {props.type === Editor.BlockType.Story && <StoryTitle title={props.title} storyId={props.storyId} />}
      {props.type === Editor.BlockType.Thought && <ThoughtTitle />}

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
        {isSmallScreen === false && <StoryVisits storyId={props.storyId} />}
        <div
          className={css`
            height: 24px;
            margin: 0 20px;
            border-right: solid 1px ${ThemingVariables.colors.gray[1]};
          `}
        />
        <div
          className={css`
            > * + * {
              margin-left: 20px;
            }
            display: flex;
          `}
        >
          <SidebarButton />
          {permissions.canWrite && (
            <>
              <React.Suspense fallback={<></>}>
                <RefreshAllQuestionBlockButton storyId={props.storyId} />
              </React.Suspense>
              {props.type === Editor.BlockType.Story && (
                <IconButton
                  hoverContent={props.format?.fullWidth ? 'Disable Full Width' : 'Full Width'}
                  icon={props.format?.fullWidth ? IconMenuNormalWidth : IconMenuFullWidth}
                  color={ThemingVariables.colors.text[0]}
                  onClick={() => {
                    setStoryFormat('fullWidth', !props.format?.fullWidth)
                  }}
                />
              )}
            </>
          )}

          {props.type === Editor.BlockType.Story && (
            <>
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
            </>
          )}

          {props.storyId && props.type === Editor.BlockType.Story && <StoryConfigButton storyId={props.storyId} />}
        </div>
      </div>
    </>
  )
}

const StoryConfigButton: React.FC<{ storyId: string }> = ({ storyId }) => {
  const animation = useTippyMenuAnimation('scale')

  return (
    <Tippy
      render={(attrs) => <StoryConfigPopOver storyId={storyId} animate={animation.controls} {...attrs} />}
      hideOnClick={true}
      theme="tellery"
      animation={true}
      onMount={animation.onMount}
      onHide={(instance) => {
        animation.onHide(instance)
      }}
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
      <IconButton icon={IconCommonMore} color={ThemingVariables.colors.text[0]} />
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
            : t('Refresh {{count}} question', { count: storySnapshotManger.total })
        }
        color={ThemingVariables.colors.text[0]}
        loading={storySnapshotManger.mutating !== 0}
        onClick={storySnapshotManger.mutating !== 0 ? storySnapshotManger.cancelAll : storySnapshotManger.runAll}
      />
    </div>
  )
}

export const NavigationHeader = memo(_NavigationHeader, (a, b) => dequal(a, b))
