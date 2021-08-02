import { css, cx } from '@emotion/css'
import ReactCalendar from 'react-calendar'
import dayjs from 'dayjs'
import { useMemo, useState, forwardRef, useCallback } from 'react'

import { IconCommonArrowDouble, IconCommonArrowDropDown } from '@app/assets/icons'
import { useAllThoughts, useMgetBlocks } from '@app/hooks/api'
import type { Thought } from '@app/types'
import { ThemingVariables } from '@app/styles'

export const Calendar = forwardRef<
  HTMLDivElement,
  {
    className?: string
    value: Date
    onChange(date: Date, id?: string): void
    onHover(id?: string): void
  }
>(function Calendar(props, ref) {
  const { data: thoughts } = useAllThoughts()
  const [activeStartDate, setActiveStartDate] = useState<Date>(props.value)
  const blockIds = useMemo(
    () =>
      thoughts
        ?.filter((thought) => Math.abs(dayjs(thought.date).diff(activeStartDate, 'days')) <= 31)
        .map(({ id }) => id) || [],
    [activeStartDate, thoughts]
  )
  const { data: blocks } = useMgetBlocks(blockIds)
  const map = useMemo(
    () =>
      thoughts?.reduce<{ [date: string]: string }>((obj, thought) => {
        obj[dayjs(thought.date).format('YYYY-MM-DD')] = thought.id
        return obj
      }, {}) || {},
    [thoughts]
  )
  const highlights = useMemo(
    () =>
      Object.values(blocks || {}).reduce<{ [YYYYMMDD: string]: number }>((obj, entry) => {
        const block = entry as Thought
        if (block.content?.date) {
          obj[block.content.date] = Math.max((block.children?.length || 0) >> 1, 1)
        }
        return obj
      }, {}),
    [blocks]
  )
  const handleDateChange = useCallback(
    (date: Date) => {
      props.onChange(date as Date, map[dayjs(date as Date).format('YYYY-MM-DD')])
    },
    [map, props]
  )

  return (
    <div
      ref={ref}
      onMouseLeave={() => {
        props.onHover(undefined)
      }}
    >
      <ReactCalendar
        view="month"
        value={props.value}
        onChange={handleDateChange}
        calendarType="US"
        locale="en"
        tileDisabled={({ date }) => date > new Date()}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={(value) => setActiveStartDate(value.activeStartDate)}
        prev2Label={
          <IconCommonArrowDouble
            color={ThemingVariables.colors.text[1]}
            className={css`
              display: block;
              transform: rotate(180deg);
            `}
          />
        }
        prevLabel={
          <IconCommonArrowDropDown
            color={ThemingVariables.colors.text[1]}
            className={css`
              display: block;
              transform: rotate(90deg);
            `}
          />
        }
        nextLabel={
          <IconCommonArrowDropDown
            color={ThemingVariables.colors.text[1]}
            className={css`
              display: block;
              transform: rotate(270deg);
            `}
          />
        }
        next2Label={<IconCommonArrowDouble color={ThemingVariables.colors.text[1]} />}
        className={cx(
          css`
            width: 274px;
            border-radius: 8px;
            padding: 20px 8px;

            & .react-calendar__navigation {
              margin-bottom: 8px;

              .react-calendar__navigation__label {
                outline: none;
                border: none;
                background-color: transparent;
                font-weight: 500;
                font-size: 12px;
              }

              .react-calendar__navigation__arrow {
                outline: none;
                border: none;
                font-size: 0;
                flex-shrink: 0;
                flex-basis: 20px !important;
                padding: 0;
                margin: 0 4px;
                background-color: transparent;
                cursor: pointer;
              }
            }

            & .react-calendar__month-view__days {
              display: block;
              margin: -4px;
            }

            & .react-calendar__month-view__weekdays {
              margin: 4px -4px;

              .react-calendar__month-view__weekdays__weekday {
                text-align: center;
                vertical-align: middle;
                cursor: default;

                abbr {
                  text-decoration: none;
                  font-weight: 500;
                  font-size: 12px;
                  line-height: 30px;
                  color: ${ThemingVariables.colors.text[2]};
                }
              }
            }
          `,
          props.className
        )}
        tileContent={({ date }) => (
          <div
            className={css`
              height: 24px;
              width: 24px;
              margin-top: -24px;
              z-index: -1;
            `}
            onMouseEnter={() => {
              props.onHover(map[dayjs(date).format('YYYY-MM-DD')])
            }}
          />
        )}
        tileClassName={(tile) => {
          const key = dayjs(tile.date).format('YYYY-MM-DD')
          return cx(
            css`
              color: ${ThemingVariables.colors.text[0]};
              cursor: pointer;
              outline: none;
              height: 30px;
              width: 30px;
              padding: 3px;
              display: block;
              background-color: transparent;
              border: none;
              box-sizing: border-box;
              border-radius: 8px;
              flex-basis: 30px !important;
              margin: 4px;

              &:disabled {
                color: ${ThemingVariables.colors.text[2]};
                cursor: not-allowed;
              }

              &.react-calendar__month-view__days__day--neighboringMonth abbr {
                color: ${ThemingVariables.colors.text[2]};
                background-color: transparent;
              }

              &:hover {
                padding: 2px;
                border: 1px solid ${ThemingVariables.colors.primary[2]};
              }

              & abbr {
                display: block;
                border-radius: 6px;
                height: 24px;
                width: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: 500;
              }
            `,
            key === dayjs(props.value).format('YYYY-MM-DD')
              ? css`
                  padding: 2px;
                  border: 1px solid ${ThemingVariables.colors.primary[1]} !important;
                `
              : undefined,
            [
              css`
                color: ${ThemingVariables.colors.text[0]};
              `,
              css`
                & abbr {
                  color: ${ThemingVariables.colors.gray[5]};
                  background-color: ${ThemingVariables.colors.primary[1]};
                  opacity: 0.1;
                }
              `,
              css`
                & abbr {
                  color: ${ThemingVariables.colors.gray[5]};
                  background-color: ${ThemingVariables.colors.primary[1]};
                  opacity: 0.3;
                }
              `,
              css`
                & abbr {
                  color: ${ThemingVariables.colors.gray[5]};
                  background-color: ${ThemingVariables.colors.primary[1]};
                  opacity: 0.5;
                }
              `
            ][highlights?.[key] || 0] ||
              css`
                & abbr {
                  color: ${ThemingVariables.colors.gray[5]};
                  background-color: ${ThemingVariables.colors.primary[1]};
                  opacity: 1;
                }
              `
          )
        }}
      />
    </div>
  )
})
