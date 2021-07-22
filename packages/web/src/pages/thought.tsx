import { SecondaryEditor } from '@app/components/editor'
import { StoryQuestionsEditor } from '@app/components/StoryQuestionsEditor'
import { ThoughtItem } from '@app/components/ThoughtItem'
import { useBlockSuspense } from '@app/hooks/api'
import type { Thought } from '@app/types'
import { css } from '@emotion/css'
import React, { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ThoughtsCalendar } from '../components/ThoughtsCalendar'

export function ThoughtPage() {
  const { id } = useParams<{ id: string }>()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const thoughtBlock = useBlockSuspense<Thought>(id)

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
            <ThoughtsCalendar />
          </div>
          <div
            className={css`
              flex: 1;
              overflow-y: scroll;
              padding-top: 40px;
            `}
          >
            <ThoughtItem id={id} date={thoughtBlock.content.date} isFirst={true} />
          </div>
        </div>
        <SecondaryEditor />
      </div>
      <StoryQuestionsEditor />
    </div>
  )
}

export default ThoughtPage
