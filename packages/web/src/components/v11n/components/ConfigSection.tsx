import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import { ReactNode } from 'react-router/node_modules/@types/react'

export function ConfigSection(props: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section
      className={css`
        padding: 8px 10px;
        border-top: 1px solid #dedede;

        > * + * {
          margin-top: 4px;
        }
      `}
    >
      {props.title ? (
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
            {props.title}
          </h3>
          {props.right ? <div>{props.right}</div> : null}
        </div>
      ) : null}
      {props.children}
    </section>
  )
}
