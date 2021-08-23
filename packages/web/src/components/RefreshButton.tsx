import { IconCommonRefresh } from '@app/assets/icons'
import { cx } from '@emotion/css'
import { useAnimation } from 'framer-motion'
import React, { ReactNode, useEffect } from 'react'
import IconButton from './kit/IconButton'

const _RefreshButton: React.ForwardRefRenderFunction<
  HTMLDivElement,
  { color: string; loading: boolean; onClick: () => void; className?: string; hoverContent?: ReactNode }
> = ({ color, loading, onClick, className, hoverContent }, ref) => {
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
    <IconButton
      className={cx(className)}
      hoverContent={hoverContent}
      icon={IconCommonRefresh}
      color={color}
      spin={loading}
      onClick={onClick}
    />
  )
}

export const RefreshButton = React.forwardRef(_RefreshButton)
