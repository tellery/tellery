import { css } from '@emotion/css'
import type { MouseEvent } from 'react'
import type { Props, Payload } from '@tellery/recharts/types/component/DefaultLegendContent'
import { IconVisualizationCircle } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'

const fontSize = 14

const iconSize = 14

const iconMargin = 4

const itemMargin = 10

export function LegendContent(props: Props) {
  return (
    <div
      className={css`
        width: 100%;
        overflow-x: auto;
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
          &::-webkit-scrollbar {
            display: none;
          }
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
            onMouseEnter={() => {
              props.onMouseEnter?.(item as unknown as MouseEvent)
            }}
            onMouseLeave={() => {
              props.onMouseLeave?.(item as unknown as MouseEvent)
            }}
          />
        ))}
      </ul>
    </div>
  )
}

function LegendItem(props: { value: Payload; onMouseEnter(): void; onMouseLeave(): void }) {
  return (
    <li
      className={css`
        display: inline-block;
        margin-left: ${itemMargin}px;
        align-items: center;
        font-size: ${fontSize}px;
        color: ${ThemingVariables.colors.text[0]};
        font-weight: 500;
        line-height: ${fontSize}px;
        white-space: nowrap;
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
      `}
      key={props.value.id}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <IconVisualizationCircle
        color={props.value.color}
        width={iconSize}
        height={iconSize}
        className={css`
          margin-right: ${iconMargin}px;
          vertical-align: top;
        `}
      />
      {props.value.value}
    </li>
  )
}
