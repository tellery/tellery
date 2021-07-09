import { useDebounce } from '@app/hooks'
import { dequal } from 'dequal'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export const useDebouncedDimension = (
  ref: React.RefObject<HTMLDivElement | null>,
  debounceDelay: number,
  leading: boolean
) => {
  const lastEntries = useRef<DOMRectReadOnly>()
  const [resizing, setResizing] = useState(false)
  const [dimensions, setDimensions] = useState<DOMRectReadOnly | null>(null)

  const debouncedCalculate = useDebounce(
    (domRect: DOMRectReadOnly) => {
      setDimensions(domRect)
      setResizing(false)
    },
    debounceDelay,
    leading
  )

  const observerCallback = useCallback(
    (entries: ResizeObserverEntry[]) => {
      const contentRect = entries[0].contentRect
      if (lastEntries.current !== contentRect) {
        debouncedCalculate(contentRect)
      }

      if (lastEntries.current === undefined || dequal(lastEntries.current, contentRect)) {
        lastEntries.current = contentRect
      } else {
        setResizing(true)
      }
    },
    [debouncedCalculate]
  )

  useEffect(() => {
    if (!ref.current) {
      return
    }
    const { current } = ref
    const observer = new ResizeObserver(observerCallback)
    observer.observe(current, { box: 'border-box' })
    return () => {
      observer.unobserve(current)
    }
  }, [ref, observerCallback])

  return [dimensions, resizing] as [DOMRectReadOnly | null, boolean]
}
