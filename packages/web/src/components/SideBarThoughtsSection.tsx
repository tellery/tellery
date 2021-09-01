import { IconCommonAdd } from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { useOpenStory } from '@app/hooks'
import { useAllThoughts } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useCommit } from '@app/hooks/useCommit'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { useStoryPathParams } from '@app/hooks/useStoryPathParams'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { blockIdGenerator } from '@app/utils'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { Calendar } from './Calendar'
import { BlockContentOverview } from './editor/BlockContentOverview'
import IconButton from './kit/IconButton'
import { MenuItemDivider } from './MenuItemDivider'
import { SideBarContentLayout } from './SideBarContentLayout'

export const SideBarThoughtsSection = () => {
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const workspace = useWorkspace()
  const commit = useCommit()
  const openStory = useOpenStory()
  const [date, setDate] = useState(new Date())
  const [activeStartDate, setActiveStartDate] = useState(new Date())

  const user = useLoggedUser()

  const createTodaysNotes = useCallback(async () => {
    const id = blockIdGenerator()
    await commit({
      storyId: id,
      transcation: createTranscation({
        operations: [
          {
            cmd: 'set',
            id: id,
            path: [],
            table: 'block',
            args: {
              id: id,
              alive: true,
              parentId: workspace.id, // workspaceId
              parentTable: 'workspace',
              content: { date: dayjs().format('YYYY-MM-DD') },
              children: [],
              permissions: [{ role: 'manager', type: 'user', id: user.id }],
              type: 'thought',
              storyId: id,
              version: 0
            }
          }
        ]
      })
    })
    openStory(id, {})
    refetchThoughts()
  }, [commit, openStory, refetchThoughts, user.id, workspace.id])

  const showCreateTodaysNotes = useMemo(() => {
    if (thoughts === undefined) return false
    const today = dayjs().format('YYYY-MM-DD')
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      return false
    }
    return true
  }, [thoughts])

  const { t } = useTranslation()
  const currentMonthThoughts = useMemo(() => {
    const currentMonthString = dayjs(activeStartDate).format('YYYY-MM')
    return thoughts?.filter((thought) => {
      return thought.date?.indexOf(currentMonthString) !== -1
    })
  }, [activeStartDate, thoughts])

  return (
    <SideBarContentLayout title={t`Thoughts`}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <Calendar
          value={date}
          onActiveStartDataChange={(view) => {
            setActiveStartDate(view.activeStartDate)
          }}
          onChange={(_date, id) => {
            setDate(_date)
            if (id) {
              openStory(id, {})
            }
          }}
        />
        <MenuItemDivider />
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 8px 8px;
          `}
        >
          <div
            className={css`
              font-size: 16px;
              color: ${ThemingVariables.colors.text[0]};
              font-weight: 600;
            `}
          >
            {dayjs(activeStartDate).format('MMM YYYY')}
          </div>
          <IconButton
            icon={IconCommonAdd}
            hoverContent={t`Capture today's thought`}
            disabled={showCreateTodaysNotes === false}
            onClick={createTodaysNotes}
          />
        </div>
        <PerfectScrollbar
          className={css`
            flex: 1;
            margin-top: 8px;
            overflow-y: auto;
          `}
          options={{ suppressScrollX: true }}
        >
          {currentMonthThoughts && <StoryCards thoughtIds={currentMonthThoughts} />}
        </PerfectScrollbar>
      </div>
    </SideBarContentLayout>
  )
}

const StoryCard: React.FC<{ thoughtId: string; date: string; isActive: boolean }> = ({ thoughtId, isActive, date }) => {
  const blocksMap = useStoryBlocksMap(thoughtId)
  const thought = blocksMap?.[thoughtId]
  const openStory = useOpenStory()

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
        openStory(thoughtId)
      }}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          overflow: hidden;
        `}
      >
        <div
          className={css`
            margin-right: auto;
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          {dayjs(date).format('MMM DD, YYYY')}
        </div>
      </div>

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
          margin-top: 5px;
          pointer-events: none;
        `}
      >
        {thought?.children?.slice(0, 2).map((blockId) => {
          if (!blocksMap?.[blockId]) return null
          return <BlockContentOverview key={blockId} block={blocksMap?.[blockId]} />
        })}
      </div>
    </div>
  )
}

const StoryCards: React.FC<{ thoughtIds: { id: string; date: string }[] }> = ({ thoughtIds }) => {
  const storyId = useStoryPathParams()
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
      <React.Suspense fallback={<></>}>
        {thoughtIds.map((thought) => {
          return (
            <StoryCard thoughtId={thought.id} key={thought.id} date={thought.date} isActive={storyId === thought.id} />
          )
        })}
      </React.Suspense>
    </div>
  )
}
