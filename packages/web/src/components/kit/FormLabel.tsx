import { css, cx } from '@emotion/css'
import type { ReactNode } from 'react'
import { ThemingVariables } from 'styles'

export default function FormLabel(props: { className?: string; children: ReactNode }) {
  return (
    <label
      className={cx(
        css`
          font-weight: 600;
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[1]};
          margin-bottom: 5px;
          display: block;
        `,
        props.className
      )}
    >
      {props.children}
    </label>
  )
}
