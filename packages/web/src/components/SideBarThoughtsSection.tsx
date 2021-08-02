import { IconCommonAdd } from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useOpenStory } from '@app/hooks'
import { useAllThoughts } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import React, { useCallback, useMemo, useState } from 'react'
import { SideBarContentLayout } from './SideBarContentLayout'
import { Calendar } from './Calendar'
import { SmallStory } from './SmallStory'
import { FormButton } from './kit/FormButton'

export const SideBarThoughtsSection = () => {
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const today = useMemo(() => {
    return dayjs().format('YYYY-MM-DD')
  }, [])

  const workspace = useWorkspace()
  const commit = useCommit()
  const openStory = useOpenStory()
  const [date, setDate] = useState(new Date())
  const [currentThoughtId, setCurrentThoughtId] = useState<string>()
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
    <SideBarContentLayout title="Thoughts">
      <FormButton
        variant="primary"
        className={css`
          width: calc(100% - 16px);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 8px;
        `}
        disabled={!showCreateTodaysNotes}
        onClick={createTodaysNotes}
      >
        <IconCommonAdd
          color={showCreateTodaysNotes ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.text[1]}
          className={css`
            margin-right: 4px;
          `}
        />
        <span>Capture today&apos;s thought</span>
      </FormButton>
      <Calendar
        value={date}
        onChange={(_date, id) => {
          setDate(_date)
          if (id) {
            openStory(id, {})
          }
        }}
        onHover={setCurrentThoughtId}
      />
      {currentThoughtId && (
        <SmallStory
          className={css`
            padding: 0 20px;
          `}
          color="transparent"
          storyId={currentThoughtId}
        />
      )}
    </SideBarContentLayout>
  )
}
