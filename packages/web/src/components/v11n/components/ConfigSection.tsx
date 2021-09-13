import { css } from '@emotion/css'
import { ReactNode } from 'react-router/node_modules/@types/react'

export function ConfigSection(props: { children: ReactNode }) {
  return (
    <section
      className={css`
        padding: 8px 10px;

        > * + * {
          margin-top: 4px;
        }
      `}
    >
      {props.children}
    </section>
  )
}
