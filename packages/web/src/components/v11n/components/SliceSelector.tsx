import { cx, css } from '@emotion/css'
import { CSSProperties, ReactNode, useRef, useState } from 'react'

import { BlockPopover } from '../../BlockPopover'
import { ThemingVariables } from '@app/styles'
import { IconCommonCheck } from '@app/assets/icons'

export function SliceSelector(props: {
  className?: string
  value: { key: string; title: string; color: number }
  onChange(value: { key: string; title: string; color: number }): void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <div
      className={cx(
        props.className,
        css`
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          border-radius: 8px;
          background-color: ${ThemingVariables.colors.gray[5]};
          overflow: hidden;
          height: 36px;
          width: 185px;
          padding-left: 10px;
          padding-right: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
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
          font-weight: 400;
        `}
        value={props.value.title}
        onChange={(e) => {
          props.onChange({
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
        `}
        style={{
          backgroundColor: ThemingVariables.colors.visualization[props.value.color]
        }}
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
                  props.onChange({
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
