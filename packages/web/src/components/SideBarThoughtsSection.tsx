import { IconCommonAdd } from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { useOpenStory } from '@app/hooks'
import { useAllThoughts } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useCommit } from '@app/hooks/useCommit'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { blockIdGenerator } from '@app/utils'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from './Calendar'
import { FormButton } from './kit/FormButton'
import { SideBarContentLayout } from './SideBarContentLayout'

export const SideBarThoughtsSection = () => {
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const today = useMemo(() => {
    return dayjs().format('YYYY-MM-DD')
  }, [])

  const workspace = useWorkspace()
  const commit = useCommit()
  const openStory = useOpenStory()
  const [date, setDate] = useState(new Date())
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
              content: { date: today },
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
  }, [commit, openStory, refetchThoughts, today, user.id, workspace.id])

  const showCreateTodaysNotes = useMemo(() => {
    if (thoughts === undefined) return false
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      return false
    }
    return true
  }, [thoughts, today])
  const { t } = useTranslation()

  return (
    <SideBarContentLayout title={t`Thoughts`}>
      <FormButton
        variant="secondary"
        className={css`
          background: transparent;
          width: calc(100% - 16px);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 8px;
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
        <span>{t`Capture today's thought`}</span>
      </FormButton>
      <Calendar
        value={date}
        onChange={(_date, id) => {
          setDate(_date)
          if (id) {
            openStory(id, {})
          }
        }}
      />
    </SideBarContentLayout>
  )
}
