import { css, cx } from '@emotion/css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from 'hooks'
import { dequal } from 'dequal'

export const DebouncedResizeBlock: React.FC<{
  className?: string
  disableY?: boolean
  showOverlay?: boolean
  debounceDelay?: number
  overflowHidden?: boolean
  onDimensionsUpdate: (dimensions?: DOMRect) => void
  leading?: boolean
}> = ({
  children,
  onDimensionsUpdate,
  disableY = false,
  showOverlay = false,
  debounceDelay = 500,
  overflowHidden = false,
  leading = false
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const lastEntries = useRef<DOMRectReadOnly>()
  const [resizing, setResizing] = useState(false)

  const debouncedCalculate = useDebounce(
    (domRect: DOMRectReadOnly) => {
      onDimensionsUpdate(domRect)
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

  return (
    <div
      className={cx(
        css`
          width: 100%;
          position: relative;
        `,
        disableY
          ? css`
              height: auto;
            `
          : css`
              height: 100%;
            `
      )}
      style={{
        overflow: overflowHidden && resizing ? 'hidden' : 'visible'
      }}
      ref={ref}
    >
      {showOverlay && resizing && (
        <div
          className={css`
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 100%;
            background-color: rgba(255, 255, 255, 0.5);
            z-index: 10;
          `}
        ></div>
      )}

      {children}
    </div>
  )
}
