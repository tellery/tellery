import { createTranscation } from '@app/context/editorTranscations'
import { useWorkspace } from '@app/context/workspace'
import { useCommit } from '@app/hooks/useCommit'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import { IconCommonAdd, IconCommonCalendar } from 'assets/icons'
import { BlockPopover } from 'components/BlockPopover'
import { Calendar } from 'components/Calendar'
import { SecondaryEditor, StoryEditor } from 'components/editor'
import Icon from 'components/kit/Icon'
import { SmallStory } from 'components/SmallStory'
import { StoryQuestionsEditor } from 'components/StoryQuestionsEditor'
import dayjs from 'dayjs'
import { useSearchParams } from 'hooks'
import { useAllThoughts } from 'hooks/api'
import { nanoid } from 'nanoid'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePopper } from 'react-popper'
import { useHistory, useLocation } from 'react-router-dom'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ThemingVariables } from 'styles'

function Thoughts() {
  const [date, setDate] = useState(new Date(0))
  const router = useHistory()
  const location = useLocation()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const searchParams = useSearchParams()
  useEffect(() => {
    setDate(new Date())
  }, [])

  const [open, setOpen] = useState(false)
  const [currentThoughtId, setCurrentThoughtId] = useState<string>()
  const { data: thoughts, refetch: refetchThoughts } = useAllThoughts()
  const commit = useCommit()

  useEffect(() => {
    if (searchParams.has('date') && thoughts) {
      const element = document.querySelector(`.thought-title[data-date="${searchParams.get('date')}"]`)
      if (element) {
        scrollIntoView(element, {
          scrollMode: 'if-needed',
          block: 'start',
          inline: 'nearest',
          boundary: scrollContainerRef.current
        })
      }
    }
  }, [searchParams, thoughts])

  useEffect(() => {
    if (searchParams.has('id') && thoughts) {
      const element = document.querySelector(`.thought-title[data-thought-id="${searchParams.get('id')}"]`)
      if (element) {
        scrollIntoView(element, {
          scrollMode: 'if-needed',
          block: 'start',
          inline: 'nearest',
          boundary: scrollContainerRef.current
        })
      }
    }
  }, [searchParams, thoughts])

  const referenceElement = useRef<HTMLDivElement>(null)
  const [modalRef, setModalRef] = useState<HTMLDivElement | null>(null)
  const [reference, setReference] = useState<HTMLDivElement | null>(null)

  const today = useMemo(() => {
    return dayjs().format('YYYY-MM-DD')
  }, [])

  const showCreateTodaysNotes = useMemo(() => {
    if (thoughts === undefined) return false
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      return false
    }
    return true
  }, [thoughts, today])

  const workspace = useWorkspace()

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
    refetchThoughts()
  }, [commit, refetchThoughts, today, workspace.id])

  const pop = usePopper(reference, modalRef, {
    placement: 'auto-start',
    strategy: 'absolute',
    modifiers: [
      {
        name: 'offset',
        enabled: true,
        options: {
          offset: [0, 10]
        }
      }
    ]
  })
  useEffect(() => {
    if (!open) {
      setModalRef(null)
      setReference(null)
      setCurrentThoughtId(undefined)
    }
  }, [open])

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
            <div
              ref={referenceElement}
              className={css`
                line-height: 0;
              `}
            >
              <IconCommonCalendar
                className={css`
                  cursor: pointer;
                `}
                onClick={() => {
                  setOpen(true)
                }}
              />
            </div>
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
                  `}
                >
                  <Icon
                    icon={IconCommonAdd}
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
            {thoughts?.map((thought) => {
              return <Thought id={thought.id} key={thought.id} date={thought.date} />
            })}
          </div>
        </div>
        <SecondaryEditor />
      </div>
      <StoryQuestionsEditor />

      <BlockPopover open={open} setOpen={setOpen} referenceElement={referenceElement.current} placement="bottom-start">
        <Calendar
          ref={setReference}
          value={date}
          onChange={(_date, id) => {
            setDate(_date)
            if (id) {
              router.push(`${location.pathname}?id=${id}`)
              setOpen(false)
            }
          }}
          onHover={setCurrentThoughtId}
          className={css`
            margin: 10px;
          `}
        />
        {currentThoughtId && (
          <div
            ref={setModalRef}
            {...pop.attributes.popper}
            style={{ ...(pop.styles.popper as React.CSSProperties), zIndex: 0 }}
          >
            <SmallStory
              className={css`
                height: 360px;
                width: 280px;
                box-shadow: ${ThemingVariables.boxShadows[0]};
                border-radius: 8px;
                padding: 8px;
              `}
              color={ThemingVariables.colors.gray[5]}
              storyId={currentThoughtId}
            />
          </div>
        )}
      </BlockPopover>
      {/* <StoryQuestionsEditor /> */}
    </div>
  )
}

export const Thought: React.FC<{ id: string; date: string }> = ({ id, date }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  // const isOnScreen = useOnScreen(ref)
  return (
    <ThoughtContainer ref={ref}>
      <ThoughtHeader>
        <Icon
          icon={IconCommonCalendar}
          color={ThemingVariables.colors.gray[5]}
          className={css`
            background-color: ${ThemingVariables.colors.primary[1]};
            padding: 5px;
            border-radius: 100%;
            margin-right: 10px;
          `}
        />
        <ThoughtTitle className="thought-title" data-thought-id={id} data-date={date}>
          {dayjs(date).format('MMM DD, YYYY')}
        </ThoughtTitle>
      </ThoughtHeader>
      <StoryEditor storyId={id} key={id} slim showTitle={false} fullWidth />
    </ThoughtContainer>
  )
}

export const ThoughtTitle = styled.h1`
  font-family: Helvetica Neue;
  font-weight: 500;
  font-size: 14px;
  line-height: 17px;
  color: ${ThemingVariables.colors.text[1]};
`

export const ThoughtHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`

export const ThoughtContainer = styled.div`
  padding: 0 80px;
  margin-bottom: 40px;
`

export default Thoughts
