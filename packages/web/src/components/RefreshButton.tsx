import { css } from '@emotion/css'
import { IconCommonRefresh } from 'assets/icons'
import { motion, useAnimation } from 'framer-motion'
import React, { useEffect } from 'react'
import IconButton from './kit/IconButton'

const _RefreshButton: React.ForwardRefRenderFunction<
  HTMLDivElement,
  { color: string; loading: boolean; onClick: () => void }
> = ({ color, loading, onClick }, ref) => {
  const controls = useAnimation()

  useEffect(() => {
    if (loading) {
      controls.stop()
      controls.start({ rotate: 360 })
    } else {
      controls.set({ rotate: 0 })
      controls.stop()
    }
  }, [controls, loading])

  return (
    <motion.div
      ref={ref}
      animate={controls}
      transition={{ type: 'tween', repeat: Infinity, duration: 0.75, ease: 'linear' }}
      className={css`
        display: inline-flex;
        align-items: center;
      `}
    >
      <IconButton icon={IconCommonRefresh} color={color} onClick={onClick} />
    </motion.div>
  )
}

export const RefreshButton = React.forwardRef(_RefreshButton)
