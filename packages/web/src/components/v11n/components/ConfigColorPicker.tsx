import { IconCommonCheck } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React, { CSSProperties, ReactNode } from 'react'

export function ConfigColorPicker(props: { value: number; onChange: (value: number) => void }) {
  return (
    <div
      className={css`
        margin: -2px;
        display: flex;
        flex-wrap: wrap;
        width: 180px;
      `}
    >
      {ThemingVariables.colors.visualization.map((color, index) => (
        <Button
          key={color}
          onClick={() => {
            props.onChange(index)
          }}
          style={{
            backgroundColor: color,
            cursor: props.value === index ? 'default' : 'pointer'
          }}
        >
          {props.value === index ? <IconCommonCheck color={ThemingVariables.colors.gray[5]} /> : ''}
        </Button>
      ))}
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
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin: 2px;
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
