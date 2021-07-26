import { css } from '@emotion/css'
import { IconCommonStoryBlock } from '@app/assets/icons'
import { BlockTitle } from '@app/components/editor'
import { SmallStory } from '@app/components/SmallStory'
import { useOpenStory } from '@app/hooks'
import { useQuestionBackLinks, useStory } from '@app/hooks/api'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePopper } from 'react-popper'
import { ThemingVariables } from '@app/styles'
import type { Ref } from '@app/types'
import { EditorPopover } from '../EditorPopover'

export const _QuestionRefsPopover = (props: {
  open: boolean
  referenceElement: HTMLDivElement | null
  setOpen: (show: boolean) => void
  questionBlockId: string
  storyId: string
}) => {
  const { open, storyId, setOpen, referenceElement, questionBlockId } = props
  const { data: questionBackLinks } = useQuestionBackLinks(questionBlockId)
  const refByStory = useMemo(() => {
    return (
      questionBackLinks?.backwardRefs?.reduce((a, c) => {
        a[c.storyId] = [...(a[c.storyId] ?? []), c]
        return a
      }, {} as Record<string, Ref[]>) ?? {}
    )
  }, [questionBackLinks])
  const stories = useMemo(() => Object.keys(refByStory).filter((id) => id !== storyId), [refByStory, storyId])
  const openStoryHandler = useOpenStory()
  const [hoveringIndex, setHoveringIndex] = useState(-1)
  const currentStoryRef = useMemo<Ref | undefined>(
    () => refByStory?.[stories[hoveringIndex]]?.[0],
    [refByStory, stories, hoveringIndex]
  )
  const [modalRef, setModalRef] = useState<HTMLDivElement | null>(null)
  const [reference, setReference] = useState<HTMLDivElement | null>(null)
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
    if (open === false) {
      setModalRef(null)
      setReference(null)
      setHoveringIndex(-1)
    }
  }, [open])
  const openRef = useCallback(
    (ref: Ref, altKeyPressed: boolean) => {
      openStoryHandler(ref.storyId, { blockId: ref.blockId, _currentStoryId: storyId, isAltKeyPressed: !altKeyPressed })
      setOpen(false)
    },
    [openStoryHandler, setOpen, storyId]
  )

  return (
    <EditorPopover open={open} setOpen={setOpen} referenceElement={referenceElement} placement="right-start">
      <div
        className={css`
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          width: 280px;
          line-height: 0;
        `}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHoveringIndex((index) => {
              return index <= 1 ? 0 : index - 1
            })
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHoveringIndex((index) => {
              const length = stories.length
              return index >= length ? length : index + 1
            })
          } else if (e.key === 'Enter') {
            if (currentStoryRef) {
              openRef(currentStoryRef, e.altKey)
            }
          }
        }}
        ref={setReference}
      >
        <div
          className={css`
            font-weight: 500;
            font-size: 12px;
            line-height: 1.2;
            color: ${ThemingVariables.colors.text[1]};
            padding: 8px;
          `}
        >
          Ref Questions
        </div>
        <div
          className={css`
            max-height: 330px;
            overflow-y: auto;
            padding: 0 8px 8px 8px;
          `}
        >
          {stories.map((storyId, index) => {
            return (
              <StoryRefCell
                key={storyId}
                storyId={storyId}
                selected={hoveringIndex === index}
                index={index}
                setIndex={setHoveringIndex}
                onClick={(e) => {
                  if (currentStoryRef) {
                    openRef(refByStory[currentStoryRef.storyId][0], e.altKey)
                  }
                }}
              />
            )
          })}
        </div>
      </div>
      {currentStoryRef && (
        <div
          ref={setModalRef}
          {...pop.attributes.popper}
          style={{ ...(pop.styles.popper as React.CSSProperties), zIndex: 0 }}
        >
          <SmallStory
            className={css`
              height: 360px;
              width: 280px;
              background: ${ThemingVariables.colors.gray[5]};
              box-shadow: ${ThemingVariables.boxShadows[0]};
              border-radius: 8px;
              padding: 8px;
            `}
            color={ThemingVariables.colors.gray[5]}
            storyId={currentStoryRef.storyId}
            blockId={currentStoryRef.blockId}
          />
        </div>
      )}
    </EditorPopover>
  )
}

export const QuestionRefsPopover = _QuestionRefsPopover

const StoryRefCell = (props: {
  storyId: string
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  selected: boolean
  index: number
  setIndex: (index: number) => void
}) => {
  const { storyId, selected, index, setIndex } = props
  const { data: story } = useStory(storyId)
  const ref = useRef<HTMLDivElement | null>(null)

  if (!story) {
    return null
  }
  return (
    <div
      ref={ref}
      onClick={props.onClick}
      tabIndex={index}
      style={{
        backgroundColor: selected ? ThemingVariables.colors.primary[4] : 'transparent'
      }}
      onMouseEnter={() => {
        setIndex(index)
      }}
      className={css`
        cursor: pointer;
        outline: none;
        border-radius: 8px;
        height: 44px;
        padding: 5px 12px;
        display: flex;
        align-items: center;
        font-size: 14px;
        line-height: 17px;
        color: ${ThemingVariables.colors.text[0]};
      `}
    >
      <IconCommonStoryBlock
        className={css`
          margin-right: 8px;
          flex-shrink: 0;
        `}
      />
      <div
        className={css`
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        <BlockTitle block={story} />
      </div>
    </div>
  )
}
