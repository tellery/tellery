import { css } from '@emotion/css'
import type { Props, Payload } from '@tellery/recharts/types/component/DefaultLegendContent'
import type { MouseEvent } from 'react'
import { IconVisualizationCircle } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'

const fontSize = 14

const iconSize = 14

const iconMargin = 4

export function LegendContentVertical(props: Props) {
  return (
    <ul
      className={css`
        padding: 0;
        margin: 0;
        &::-webkit-scrollbar {
          display: none;
        }
        display: flex;
        flex-direction: column;
      `}
      style={{
        textAlign: props.align,
        verticalAlign: props.verticalAlign
      }}
    >
      {props.payload?.map((item) => (
        <LegendItem
          key={item.id}
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
  )
}

function LegendItem(props: { value: Payload; onMouseEnter(): void; onMouseLeave(): void }) {
  return (
    <li
      className={css`
        width: 100%;
        display: inline-flex;
        align-items: center;
        color: ${ThemingVariables.colors.text[0]};
        font-weight: 500;
        white-space: nowrap;
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
          flex-shrink: 0;
        `}
      />
      <span
        className={css`
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: ${fontSize}px;
          line-height: 1.5;
        `}
      >
        {props.value.value}
      </span>
    </li>
  )
}
