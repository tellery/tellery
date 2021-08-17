import { useState, useEffect, useCallback, RefObject } from 'react'
import { throttle } from 'lodash'
import { dequal } from 'dequal'

export function useDimensions<T extends HTMLElement>(
  element: T | undefined | null,
  throttleMs: number,
  enable: boolean = true
): {
  height: number
  width: number
} {
  const [dimensions, setDimensions] = useState(
    element?.getBoundingClientRect() || {
      width: 0,
      height: 0
    }
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleResize = useCallback(
    throttle(
      (entries: ResizeObserverEntry[]) => {
        if (entries[0]?.target === element) {
          setDimensions((oldDimensions) => {
            const newDimensions = {
              width: entries[0].contentRect.width,
              height: entries[0].contentRect.height
            }
            if (dequal(oldDimensions, newDimensions) === false) return newDimensions
            return oldDimensions
          })
        }
      },
      throttleMs,
      { trailing: true }
    ),
    [throttleMs]
  )
  useEffect(() => {
    if (!element || !enable) {
      return
    }
    // setDimensions(current.getBoundingClientRect())
    const observer = new ResizeObserver(handleResize)
    observer.observe(element, { box: 'border-box' })
    return () => {
      observer.unobserve(element)
    }
  }, [element, handleResize, enable])

  return dimensions
}
