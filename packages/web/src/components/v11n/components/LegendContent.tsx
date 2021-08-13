import { css, cx } from '@emotion/css'
import { MouseEvent, useRef } from 'react'
import type { Props, Payload } from '@tellery/recharts/types/component/DefaultLegendContent'
import { IconVisualizationCircle } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Tippy from '@tippyjs/react'
import { useTextWidth } from '@tag0/use-text-width'
import { fontFamily } from '../constants'
import { useDimensions } from '@app/hooks/useDimensions'

const fontSize = 14

const iconSize = 14

const iconMargin = 4

const itemMargin = 15

export function LegendContent(props: Props) {
  const ref = useRef<HTMLElement>(null)
  const textWidth = useTextWidth({
    text: props.payload?.map((item) => item.value).join(''),
    font: `${fontSize}px ${fontFamily}`
  })
  const { width: containerWidth } = useDimensions(ref, 0)
  const additionalWidth = props.payload ? props.payload.length * (iconMargin + iconSize + itemMargin) : 0
  const isSmall = textWidth + additionalWidth > containerWidth

  return (
    <PerfectScrollbar
      containerRef={(el) => {
        // @ts-ignore
        ref.current = el
      }}
      options={{ suppressScrollY: true }}
      className={css`
        width: 100%;
        overflow-x: auto;
        & .ps__rail-x {
          height: 9px !important;
        }
        & .ps__thumb-x {
          height: 5px !important;
        }
      `}
    >
      <ul
        className={css`
          padding: 0;
          margin: 0;
          margin-left: -${itemMargin}px;
          line-height: ${fontSize}px;
          height: ${fontSize + 4}px;
          width: max-content;
        `}
        style={{
          textAlign: props.align,
          verticalAlign: props.verticalAlign
        }}
      >
        {props.payload?.map((item, index) => (
          <LegendItem
            key={(item.id || '') + index}
            value={item}
            isSmall={isSmall}
            onMouseEnter={() => {
              props.onMouseEnter?.(item as unknown as MouseEvent)
            }}
            onMouseLeave={() => {
              props.onMouseLeave?.(item as unknown as MouseEvent)
            }}
          />
        ))}
      </ul>
    </PerfectScrollbar>
  )
}

function LegendItem(props: { value: Payload; isSmall: boolean; onMouseEnter(): void; onMouseLeave(): void }) {
  return (
    <li
      className={cx(
        css`
          display: inline-block;
          margin-left: ${itemMargin}px;
          align-items: center;
          font-size: ${fontSize}px;
          color: ${ThemingVariables.colors.text[0]};
          font-weight: 500;
          line-height: ${fontSize}px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `,
        props.isSmall
          ? css`
              max-width: 160px;
            `
          : undefined
      )}
      key={props.value.id}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <Tippy content={props.value.value}>
        <span
          className={css`
            margin-right: ${iconMargin}px;
          `}
        >
          <IconVisualizationCircle
            color={props.value.color}
            width={iconSize}
            height={iconSize}
            className={css`
              vertical-align: top;
            `}
          />
        </span>
      </Tippy>
      {props.value.value}
    </li>
  )
}
