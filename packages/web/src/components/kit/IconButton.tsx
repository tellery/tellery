import { css, cx } from '@emotion/css'
import { svgColorClassName } from 'lib/svg'
import { isNil, omitBy } from 'lodash'
import { FunctionComponent, SVGAttributes, ButtonHTMLAttributes, useMemo, forwardRef } from 'react'
import { ThemingVariables } from 'styles'

export default forwardRef<
  HTMLButtonElement,
  {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
    size?: number
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton(props, ref) {
  const { icon, size, className, ...restProps } = props
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

  return (
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
})
