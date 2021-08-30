import Tippy, { TippyProps } from '@tippyjs/react/headless'
import React, { forwardRef, useState } from 'react'

const _LazyTippy: React.ForwardRefRenderFunction<Element, TippyProps> = (props, ref) => {
  const [mounted, setMounted] = useState(false)

  const lazyPlugin = {
    fn: () => ({
      onMount: () => setMounted(true),
      onHidden: () => setMounted(false)
    })
  }

  const computedProps = { ...props }

  computedProps.plugins = [lazyPlugin, ...(props.plugins || [])]

  if (props.render) {
    computedProps.render = (...args) => (mounted ? props.render?.(...args) : '')
  } else {
    computedProps.content = mounted ? props.content : ''
  }

  return <Tippy {...computedProps} ref={ref} />
}

export const LazyTippy = forwardRef(_LazyTippy)
