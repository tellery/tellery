import { css, cx } from '@emotion/css'
import { svgColorClassName } from '@app/lib/svg'
import { isNil, omitBy } from 'lodash'
import { FunctionComponent, SVGAttributes, useMemo, forwardRef, HTMLAttributes } from 'react'

export default forwardRef<
  HTMLSpanElement,
  {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
    size?: number
  } & HTMLAttributes<HTMLSpanElement>
>(function Icon(props, ref) {
  const { icon, color, size, className, ...restProps } = props
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

  return (
    <span
      ref={ref}
      className={cx(
        css`
          outline: none;
          border: none;
          padding: 0;
          background: transparent;
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
    </span>
  )
})
