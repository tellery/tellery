import { IconCommonCalendar } from '@app/assets/icons'
import { BlockPopover } from '@app/components/BlockPopover'
import { Calendar } from '@app/components/Calendar'
import { SmallStory } from '@app/components/SmallStory'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React, { useEffect, useRef, useState } from 'react'
import { usePopper } from 'react-popper'
import { useHistory } from 'react-router-dom'

export const ThoughtsCalendar: React.FC = () => {
  const referenceElement = useRef<HTMLDivElement>(null)
  const [modalRef, setModalRef] = useState<HTMLDivElement | null>(null)
  const [reference, setReference] = useState<HTMLDivElement | null>(null)
  const [currentThoughtId, setCurrentThoughtId] = useState<string>()
  const [date, setDate] = useState(new Date())
  const router = useHistory()
  const [open, setOpen] = useState(false)

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
    <>
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
      <BlockPopover open={open} setOpen={setOpen} referenceElement={referenceElement.current} placement="bottom-start">
        <Calendar
          ref={setReference}
          value={date}
          onChange={(_date, id) => {
            setDate(_date)
            if (id) {
              router.push(`/thought/${id}`)
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
    </>
  )
}
