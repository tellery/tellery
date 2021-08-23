import { cx, css } from '@emotion/css'
import { CSSProperties, ReactNode, useRef, useState } from 'react'

import { ConfigSwitch } from './ConfigSwitch'
import type { Config, Type } from '../types'
import { BlockPopover } from '../../BlockPopover'
import { ThemingVariables } from '@app/styles'
import { IconCommonCheck } from '@app/assets/icons'

export function ShapeSelector(props: {
  className?: string
  value: Config<Type.COMBO>['shapes'][0]
  onChange(value: Config<Type.COMBO>['shapes'][0]): void
}) {
  const [open, setOpen] = useState(false)
  const { onChange } = props
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      className={cx(
        props.className,
        css`
          background-color: ${ThemingVariables.colors.gray[5]};
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          height: 36px;
          width: 185px;
          padding-right: 5px;
        `
      )}
    >
      <input
        className={css`
          font-size: 14px;
          appearance: none;
          outline: none;
          border: none;
          flex: 1;
          width: 0;
          line-height: 1;
          font-weight: 400;
          text-overflow: ellipsis;
        `}
        value={props.value.title}
        onChange={(e) => {
          onChange({
            ...props.value,
            title: e.target.value
          })
        }}
        placeholder={props.value.key}
      />
      <div
        ref={ref}
        className={css`
          flex-shrink: 0;
          margin-left: 10px;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: ${ThemingVariables.colors.visualization[props.value.color] ||
          ThemingVariables.colors.visualizationOther};
        `}
        onClick={() => {
          setOpen(true)
        }}
      />
      <BlockPopover open={open} setOpen={setOpen} placement="right" referenceElement={ref.current}>
        <div
          className={css`
            padding: 20px;
            width: 240px;
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
          `}
        >
          <Label
            className={css`
              margin: -5px 0 8px 0;
            `}
          >
            Color
          </Label>
          <div
            className={css`
              margin: -2.5px;
              display: flex;
              flex-wrap: wrap;
            `}
          >
            {ThemingVariables.colors.visualization.map((color, index) => (
              <Button
                key={color}
                onClick={() => {
                  onChange({
                    ...props.value,
                    color: index
                  })
                }}
                style={{
                  backgroundColor: color,
                  cursor: props.value.color === index ? 'default' : 'pointer'
                }}
              >
                {props.value.color === index ? <IconCommonCheck color={ThemingVariables.colors.gray[5]} /> : ''}
              </Button>
            ))}
          </div>
          <Label
            className={css`
              margin: 15px 0 8px 0;
            `}
          >
            Trend line
          </Label>
          <ConfigSwitch
            value={props.value.hasTrendline}
            onChange={(hasTrendline) => {
              onChange({
                ...props.value,
                hasTrendline
              })
            }}
          />
        </div>
      </BlockPopover>
    </div>
  )
}

function Button(props: { style?: CSSProperties; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={css`
        appearance: none;
        border: none;
        outline: none;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        margin: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      style={props.style}
    >
      {props.children}
    </button>
  )
}

function Label(props: { className?: string; children: ReactNode }) {
  return (
    <h5
      className={cx(
        props.className,
        css`
          font-style: normal;
          font-weight: 500;
          font-size: 12px;
          line-height: 15px;
          color: ${ThemingVariables.colors.text[1]};
        `
      )}
    >
      {props.children}
    </h5>
  )
}
