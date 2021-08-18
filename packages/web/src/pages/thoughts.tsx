import { IconCommonAdd } from '@app/assets/icons'
import { SecondaryEditor } from '@app/components/editor'
import { StoryQuestionsEditor } from '@app/components/StoryQuestionsEditor'
import { createTranscation } from '@app/context/editorTranscations'
import { useSearchParams } from '@app/hooks'
import { useAllThoughts } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { blockIdGenerator } from '@app/utils'
import { css } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ThoughtContainer, ThoughtHeader, ThoughtItem, ThoughtTitle } from '../components/ThoughtItem'

function Thoughts() {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const searchParams = useSearchParams()
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const commit = useCommit()
  useEffect(() => {
    if (thoughts) {
      let element = null
      if (searchParams.has('id')) {
        element = document.querySelector(`.thought-title[data-thought-id="${searchParams.get('id')}"]`)
      }
      if (element) {
        scrollIntoView(element, {
          scrollMode: 'always',
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
          boundary: scrollContainerRef.current
        })
      }
    }
  }, [searchParams, thoughts])
  const showCreateTodaysNotes = useMemo(() => {
    if (thoughts === undefined) return false
    const today = dayjs().format('YYYY-MM-DD')
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      return false
    }
    return true
  }, [thoughts])
  const workspace = useWorkspace()
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
              type: 'thought',
              storyId: id,
              version: 0
            }
          }
        ]
      })
    })
    refetchThoughts()
  }, [commit, refetchThoughts, workspace.id])

  return (
    <div
      className={css`
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      `}
    >
      <div
        className={css`
          display: flex;
          flex: 1;
          align-self: flex-start;
          justify-self: stretch;
          overflow: hidden;
          width: 100%;
        `}
      >
        <div
          className={css`
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
          `}
          ref={scrollContainerRef}
        >
          <div
            className={css`
              box-shadow: 0px 1px 0px #dedede;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 25px;
              width: 100%;
              z-index: 1000;
              height: 44px;
              background-color: #fff;
            `}
          >
            Thoughts
          </div>
          <div
            className={css`
              flex: 1;
              overflow-y: scroll;
              padding-top: 40px;
            `}
          >
            {showCreateTodaysNotes && (
              <ThoughtContainer>
                <ThoughtHeader
                  onClick={createTodaysNotes}
                  className={css`
                    cursor: pointer;
                    padding: 10px 80px;
                  `}
                >
                  <IconCommonAdd
                    color={ThemingVariables.colors.gray[5]}
                    className={css`
                      background-color: ${ThemingVariables.colors.primary[1]};
                      padding: 5px;
                      border-radius: 100%;
                      margin-right: 10px;
                    `}
                  />
                  <ThoughtTitle>Capture today&apos;s thought</ThoughtTitle>
                </ThoughtHeader>
              </ThoughtContainer>
            )}
            {thoughts?.map((thought, index) => {
              return <ThoughtItem id={thought.id} key={thought.id} date={thought.date} isFirst={index === 0} />
            })}
          </div>
        </div>
        <SecondaryEditor />
      </div>
      <StoryQuestionsEditor />
    </div>
  )
}

export default Thoughts
