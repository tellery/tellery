import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { ReactNode } from 'react-router/node_modules/@types/react'

export function ConfigSection(props: { title?: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <section
      className={cx(
        css`
          padding: 8px 10px;
          > * + * {
            margin-top: 4px;
          }
          border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
        `
      )}
    >
      {props.title ? (
        <div
          className={css`
            height: 32px;
            padding-left: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            filter: ${props.children ? 'none' : 'opacity(0.25)'};
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
