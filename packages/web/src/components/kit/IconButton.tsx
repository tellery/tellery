import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { svgColorClassName } from '@app/lib/svg'
import { isNil, omitBy } from 'lodash'
import React, { FunctionComponent, SVGAttributes, ButtonHTMLAttributes, useMemo, forwardRef, ReactNode } from 'react'
import { ThemingVariables } from '@app/styles'

export default forwardRef<
  HTMLButtonElement,
  {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
    size?: number
    hoverContent?: ReactNode
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton(props, ref) {
  const { icon, size, className, hoverContent, ...restProps } = props
  const iconProps = useMemo(
    () =>
      omitBy(
        {
          width: size,
          height: size
        },
        isNil
      ),
    [size]
  )
  const color = props.disabled ? ThemingVariables.colors.gray[0] : props.color

  const button = (
    <button
      ref={ref}
      className={cx(
        css`
          outline: none;
          border: none;
          padding: 0;
          background: transparent;
          cursor: pointer;
          font-size: 0;
          line-height: 0;
          &:disabled {
            cursor: not-allowed;
          }
        `,
        color ? svgColorClassName(color, icon) : undefined,
        className
      )}
      aria-label={icon.name}
      {...restProps}
    >
      {icon(iconProps)}
    </button>
  )

  if (!hoverContent) return button

  return (
    <Tippy content={hoverContent ?? null} hideOnClick={false} arrow={false}>
      {button}
    </Tippy>
  )
})
