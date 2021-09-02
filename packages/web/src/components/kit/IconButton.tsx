import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { isNil, omitBy } from 'lodash'
import React, {
  FunctionComponent,
  SVGAttributes,
  ButtonHTMLAttributes,
  useMemo,
  forwardRef,
  ReactNode,
  useEffect
} from 'react'
import { ThemingVariables } from '@app/styles'
import { motion, useAnimation } from 'framer-motion'

export default forwardRef<
  HTMLButtonElement,
  {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
    size?: number
    hoverContent?: ReactNode
    spin?: boolean
    tippySingleton?: any
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton(props, ref) {
  const { icon, spin, size, className, hoverContent, tippySingleton, ...restProps } = props
  const iconProps = useMemo(
    () =>
      omitBy(
        {
          width: size,
          height: size,
          color: props.disabled ? ThemingVariables.colors.gray[0] : props.color
        },
        isNil
      ),
    [props.color, props.disabled, size]
  )

  const controls = useAnimation()

  useEffect(() => {
    if (spin) {
      controls.stop()
      controls.start({ rotate: 360 })
    } else {
      controls.set({ rotate: 0 })
      controls.stop()
    }
  }, [controls, spin])

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
        <motion.div
          animate={controls}
          transition={{ type: 'tween', repeat: Infinity, duration: 0.75, ease: 'linear' }}
          className={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            outline: none;
          `}
        >
          {icon(iconProps)}
        </motion.div>
      </button>
    </Tippy>
  )
})
