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
    <SideBarContentLayout title={'Thoughts'}>
      {showCreateTodaysNotes && (
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
            font-size: 12px;
            line-height: 15px;
            margin: 20px 8px;
            cursor: pointer;
            height: 36px;
            border: 1px solid ${ThemingVariables.colors.primary[1]};
            box-sizing: border-box;
            border-radius: 8px;
            color: ${ThemingVariables.colors.primary[1]};
          `}
          onClick={createTodaysNotes}
        >
          <IconCommonAdd
            color={ThemingVariables.colors.primary[1]}
            className={css`
              margin-right: 4px;
            `}
          />
          <span>Capture today&apos;s thought</span>
        </div>
      )}
      <div
        className={css`
          display: flex;
          justify-content: center;
        `}
      >
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
      </div>
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

// const ThoughtsItems: React.FC<{
//   items: {
//     id: string
//     date: string
//   }[]
// }> = ({ items }) => {
//   return (
//     <div
//       className={css`
//         padding: 10px 16px 0;
//       `}
//     >
//       {items.map((item) => (
//         <ThoughtItem key={item.id} id={item.id} date={item.date} />
//       ))}
//     </div>
//   )
// }

// const ThoughtItem: React.FC<{ id: string; date: string }> = ({ id, date }) => {
//   const openStory = useOpenStory()
//   const matchStory = useRouteMatch<{ id: string }>('/story/:id')

//   return (
//     <MainSideBarItem
//       onClick={(e) => {
//         openStory(id, {})
//       }}
//       showTitle
//       title={dayjs(date).format('MMM DD, YYYY')}
//       active={matchStory?.params.id === id}
//     ></MainSideBarItem>
//   )
// }
