import { css, cx } from '@emotion/css'
import type { ReactNode } from 'react'
import { ThemingVariables } from '@app/styles'

export function ConfigButton(props: { className?: string; children: ReactNode; active?: boolean; onClick(): void }) {
  return (
    <button
      className={cx(
        props.className,
        css`
          display: flex;
          align-items: center;
          outline: none;
          border: none;
          background: none;
          font-size: 14px;
          padding: 10px;

          height: 36px;
          border-radius: 8px;
          margin: 10px;
          cursor: pointer;
        `
      )}
      style={
        props.active
          ? {
              background: ThemingVariables.colors.primary[1],
              color: ThemingVariables.colors.gray[5],
              cursor: 'default'
            }
          : {}
      }
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}
