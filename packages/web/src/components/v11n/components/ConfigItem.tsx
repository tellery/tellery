import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import { ReactNode } from 'react'

export function ConfigItem(props: { label: string; children: ReactNode; multiline?: boolean }) {
  return (
    <div
      className={css`
        display: flex;
        align-items: ${props.multiline ? 'flex-start' : 'center'};
        justify-content: space-between;
        height: ${props.multiline ? 'unset' : '32px'};
        padding-left: 6px;
      `}
    >
      <div
        className={css`
          height: 32px;
          font-size: 12px;
          line-height: 16px;
          padding: 8px 0;
          color: ${ThemingVariables.colors.text[1]};
          flex-shrink: 0;
        `}
      >
        {props.label}
      </div>
      <div
        className={css`
          width: ${props.multiline ? 'unset' : '160px'};
          line-height: 0;
        `}
      >
        {props.children}
      </div>
    </div>
  )
}
