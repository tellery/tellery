import { IconCommonAdd } from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { useWorkspace } from '@app/context/workspace'
import { useOpenStory } from '@app/hooks'
import { useAllThoughts } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import React, { useCallback, useMemo } from 'react'
import { useRouteMatch } from 'react-router-dom'
import { MainSideBarItem } from './MainSideBarItem'
import { SideBarContentLayout } from './SideBarContentLayout'

export const SideBarThoughtsSection = () => {
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const today = useMemo(() => {
    return dayjs().format('YYYY-MM-DD')
  }, [])

  const workspace = useWorkspace()
  const commit = useCommit()
  const openStory = useOpenStory()

  const createTodaysNotes = useCallback(async () => {
    const id = nanoid()
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
              content: { date: today },
              children: [],
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
  }, [commit, openStory, refetchThoughts, today, workspace.id])

  const showCreateTodaysNotes = useMemo(() => {
    if (thoughts === undefined) return false
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      return false
    }
    return true
  }, [thoughts, today])
  return (
    <SideBarContentLayout title={'Thoughts'}>
      {showCreateTodaysNotes && (
        <div
          className={css`
            display: flex;
            align-items: center;
            padding: 0 16px;
            cursor: pointer;
          `}
          onClick={createTodaysNotes}
        >
          <IconCommonAdd
            color={ThemingVariables.colors.gray[5]}
            className={css`
              background-color: ${ThemingVariables.colors.primary[1]};
              padding: 5px;
              border-radius: 100%;
              width: 10px;
              height: 10px;
              margin: 5px 0;
              margin-right: 5px;
            `}
          />
          <span>Capture today&apos;s thought</span>
        </div>
      )}
      {thoughts && <ThoughtsItems items={thoughts} />}
    </SideBarContentLayout>
  )
}

const ThoughtsItems: React.FC<{
  items: {
    id: string
    date: string
  }[]
}> = ({ items }) => {
  return (
    <div
      className={css`
        padding: 10px 16px 0;
      `}
    >
      {items.map((item) => (
        <ThoughtItem key={item.id} id={item.id} date={item.date} />
      ))}
    </div>
  )
}

const ThoughtItem: React.FC<{ id: string; date: string }> = ({ id, date }) => {
  const openStory = useOpenStory()
  const matchStory = useRouteMatch<{ id: string }>('/story/:id')

  return (
    <MainSideBarItem
      onClick={(e) => {
        openStory(id, {})
      }}
      showTitle
      title={dayjs(date).format('MMM DD, YYYY')}
      active={matchStory?.params.id === id}
    ></MainSideBarItem>
  )
}
