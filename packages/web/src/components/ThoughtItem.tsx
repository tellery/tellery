import { css } from '@emotion/css'
import styled from '@emotion/styled'
import { IconCommonCalendar } from '@app/assets/icons'
import { StoryEditor } from '@app/components/editor'
import Icon from '@app/components/kit/Icon'
import dayjs from 'dayjs'
import { useOnScreen } from '@app/hooks'
import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { ThemingVariables } from '@app/styles'
import { BlockingUI } from '@app/components/editor/BlockBase/BlockingUIBlock'

export const ThoughtItemHeader: React.FC<{ date: string; id: string; className?: string }> = ({
  date,
  id,
  className
}) => {
  return (
    <ThoughtHeader className={className}>
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
  )
}

export const ThoughtItem: React.FC<{ id: string; date: string; isFirst: boolean; top?: ReactNode }> = ({
  id,
  date,
  isFirst,
  top
}) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [showStory, setShowStory] = useState(isFirst)
  const isOnScreen = useOnScreen(ref)

  useEffect(() => {
    if (isOnScreen && !showStory) {
      setShowStory(true)
    }
  }, [isOnScreen, showStory])

  return (
    <ThoughtContainer
      ref={ref}
      style={{
        minHeight: isFirst ? '70vh' : 300,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <ThoughtItemHeader
        id={id}
        date={date}
        className={css`
          padding: 0 80px;
        `}
      />
      <React.Suspense fallback={<BlockingUI blocking={true} />}>
        {showStory && (
          <StoryEditor
            storyId={id}
            key={id}
            top={top}
            showTitle={false}
            fullWidth
            defaultOverflowY="visible"
            className={css`
              padding: 0 120px;
              min-height: 100%;
            `}
          />
        )}
      </React.Suspense>
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
  width: 100%;
`

export const ThoughtContainer = styled.div`
  padding: 0;
  margin-bottom: 40px;
`
