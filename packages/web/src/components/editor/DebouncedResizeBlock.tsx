import { css, cx } from '@emotion/css'
import React, { useEffect, useRef } from 'react'
import { useDebouncedDimension } from './hooks/useDebouncedDimensions'

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
  const [dimensions, resizing] = useDebouncedDimension(ref, debounceDelay, leading)

  useEffect(() => {
    dimensions && onDimensionsUpdate(dimensions)
  }, [dimensions, onDimensionsUpdate])

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
              min-height: 100%;
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
