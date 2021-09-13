import { css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'
import { ReactNode } from 'react'

export function ConfigLabel(props: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      className={css`
        height: 32px;
        padding-left: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `}
    >
      <h3
        className={css`
          font-style: normal;
          font-weight: 500;
          font-size: 12px;
          line-height: 15px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        {props.children}
      </h3>
      {props.right ? <div>{props.right}</div> : null}
    </div>
  )
}
