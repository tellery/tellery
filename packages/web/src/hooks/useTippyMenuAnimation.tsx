import { PopoverMotionVariants } from '@app/styles/animations'
import { Instance } from 'tippy.js'
import { useAnimation } from 'framer-motion'
import { useCallback, useMemo } from 'react'

export const useTippyMenuAnimation = (key: keyof typeof PopoverMotionVariants) => {
  const controls = useAnimation()

  const onMount = useCallback(() => {
    controls.mount()
    controls.start(PopoverMotionVariants[key].active)
  }, [controls, key])

  const onHide = useCallback(
    ({ unmount }: Instance, finishCallback?: Function) => {
      controls.start(PopoverMotionVariants[key].inactive).then(() => {
        unmount()
        finishCallback?.()
      })
    },
    [controls, key]
  )
  return useMemo(
    () => ({
      onMount,
      onHide,
      controls
    }),
    [controls, onHide, onMount]
  )
}
