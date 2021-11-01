import { css, cx } from '@emotion/css'
import { motion, useAnimation } from 'framer-motion'
import { isNil, omitBy } from 'lodash'
import React, { forwardRef, FunctionComponent, SVGAttributes, useEffect, useMemo } from 'react'

export const Icon = forwardRef<
  HTMLDivElement,
  {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
    size?: number
    spin?: boolean
    className?: string
  }
>((props, ref) => {
  const { icon, spin, size, className } = props
  const controls = useAnimation()

  const iconProps = useMemo(
    () =>
      omitBy(
        {
          width: size,
          height: size,
          color: props.color
        },
        isNil
      ),
    [props.color, size]
  )
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
    <>
      <motion.div
        ref={ref}
        animate={controls}
        transition={{ type: 'tween', repeat: Infinity, duration: 0.75, ease: 'linear' }}
        className={cx(
          css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            outline: none;
          `,
          className
        )}
      >
        {icon(iconProps)}
      </motion.div>
    </>
  )
})
Icon.displayName = 'Icon'
