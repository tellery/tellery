import { useTextWidth } from '@imagemarker/use-text-width'
import { css } from '@emotion/css'
import { useRef, MouseEvent } from 'react'
import type { Props, Payload } from '@tellery/recharts/types/component/DefaultLegendContent'
import { useDimensions } from 'hooks/useDimensions'
import { fontFamily } from '../constants'

import { IconVisualizationCircle } from 'assets/icons'
import { ThemingVariables } from 'styles'
import Icon from 'components/kit/Icon'

const fontSize = 14

const iconSize = 14

const iconMargin = 4

const itemMargin = 10

export function LegendContent(props: Props) {
  const ref = useRef<HTMLUListElement>(null)
  const textWidth = useTextWidth({
    text: props.payload?.map((item) => item.value).join(''),
    font: `${fontSize}px ${fontFamily}`
  })
  const { width: containerWidth } = useDimensions(ref, 0)
  const additionalWidth = props.payload ? props.payload.length * (iconMargin + iconSize + itemMargin) : 0

  return (
    <ul
      ref={ref}
      className={css`
        padding: 0;
        margin: 0;
        margin-left: -${itemMargin}px;
        line-height: ${fontSize}px;
        height: ${fontSize + 3}px;
        display: flex;
        overflow-x: auto;
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
          small={textWidth + additionalWidth > containerWidth}
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

function LegendItem(props: { value: Payload; small?: boolean; onMouseEnter(): void; onMouseLeave(): void }) {
  return (
    <li
      className={css`
        display: inline-flex;
        margin-left: ${itemMargin}px;
        align-items: center;
        font-size: ${fontSize}px;
        color: ${ThemingVariables.colors.text[0]};
        font-weight: 500;
        line-height: ${fontSize}px;
        white-space: nowrap;
      `}
      key={props.value.id}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      title={props.value.value}
    >
      <Icon
        icon={IconVisualizationCircle}
        size={iconSize}
        color={props.value.color}
        className={css`
          margin-right: ${iconMargin}px;
        `}
      />
      {props.small ? null : props.value.value}
    </li>
  )
}
