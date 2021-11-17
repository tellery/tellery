import { useTippySingleton } from '@app/hooks/useTippySingleton'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import React, { ButtonHTMLAttributes, forwardRef, FunctionComponent, ReactNode, SVGAttributes } from 'react'
import { Icon } from './Icon'

export default forwardRef<
  HTMLButtonElement,
  {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
    size?: number
    hoverContent?: ReactNode
    spin?: boolean
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton(props, ref) {
  const { icon, spin, size, className, hoverContent, ...restProps } = props
  const tippySingleton = useTippySingleton()

  return (
    <Tippy
      singleton={tippySingleton}
      content={hoverContent ?? null}
      hideOnClick={false}
      arrow={false}
      disabled={!hoverContent}
    >
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
          className
        )}
        aria-label={icon.name}
        {...restProps}
      >
        <Icon icon={icon} size={size} spin={spin} color={props.color} />
      </button>
    </Tippy>
  )
})
