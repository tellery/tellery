import { css, cx } from '@emotion/css'
import React, { ReactNode } from 'react'
import { ThemingVariables } from 'styles'

export function BlockMenuItem(props: {
  icon?: ReactNode
  title: string
  desc?: string
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  active?: boolean
}) {
  return (
    <div
      className={cx(
        css`
          border-radius: 8px;
          height: 62px;
          width: 100%;
          padding: 4px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.1s ease;
          display: block;
          color: ${ThemingVariables.colors.text[0]};
          text-decoration: none;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          display: flex;
          align-items: center;
          &:hover {
            background: ${ThemingVariables.colors.primary[4]};
          }
          &:active {
            background: ${ThemingVariables.colors.primary[3]};
          }
        `,
        props.active &&
          css`
            background: ${ThemingVariables.colors.primary[3]};
          `
      )}
      onClick={props.onClick}
    >
      {props.icon && (
        <div
          className={css`
            width: 54px;
            height: 54px;
            background-color: ${ThemingVariables.colors.primary[5]};
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          {props.icon}
        </div>
      )}
      <div
        className={css`
          margin-left: 10px;
          line-height: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        <span
          className={css`
            color: ${ThemingVariables.colors.text[0]};
            font-size: 14px;
            line-height: 17px;
          `}
        >
          {props.title}
        </span>
        {props.desc ? (
          <>
            <br />
            <span
              className={css`
                color: ${ThemingVariables.colors.text[1]};
                font-size: 12px;
                line-height: 14px;
              `}
            >
              {props.desc}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
