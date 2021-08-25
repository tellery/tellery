import { css, cx } from '@emotion/css'
import React, { forwardRef, ReactNode } from 'react'
import { ThemingVariables } from '@app/styles'

const _MenuItem: React.ForwardRefRenderFunction<
  HTMLDivElement,
  {
    icon?: ReactNode
    title: ReactNode
    side?: ReactNode
    isActive?: boolean
    size?: 'small' | 'medium' | 'large'
    onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  }
> = (props, ref) => {
  const { size = 'medium' } = props
  return (
    <div
      ref={ref}
      className={cx(
        size === 'small' &&
          css`
            height: 24px;
          `,
        size === 'medium' &&
          css`
            height: 36px;
          `,
        size === 'large' &&
          css`
            height: 44px;
          `,
        css`
          border-radius: 8px;
          padding: 0px 8px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.1s ease;
          display: block;
          color: ${ThemingVariables.colors.text[0]};
          font-size: 12px;
          line-height: 14px;
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
        props.isActive &&
          css`
            background: ${ThemingVariables.colors.primary[3]};
          `
      )}
      onClick={props.onClick}
    >
      {props?.icon}
      <span
        className={css`
          margin-left: 8px;
        `}
      >
        {props.title}
      </span>
      {props.side && (
        <div
          className={css`
            margin-left: auto;
          `}
        >
          {props.side}
        </div>
      )}
    </div>
  )
}

export const MenuItem = forwardRef(_MenuItem)
