import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import { ReactNode } from 'react'

export function ConfigItem(props: { label: string; children: ReactNode }) {
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 32px;
        padding-left: 6px;
      `}
    >
      <div
        className={css`
          font-size: 12px;
          color: ${ThemingVariables.colors.text[1]};
          flex-shrink: 0;
        `}
      >
        {props.label}
      </div>
      {props.children}
    </div>
  )
}
