import React, { useCallback, useEffect } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { debounce } from 'lodash'

export const useWaitForBlockAndScrollTo = (
  blockId?: string | null,
  containerRef?: React.RefObject<HTMLDivElement> | null
) => {
  const waitForElm = useCallback(
    (selector) => {
      return new Promise((resolve: (element: Element) => void) => {
        const container = containerRef?.current
        if (!container) return
        const element = container.querySelector(selector)
        if (element) {
          return resolve(element)
        }

        const observer = new MutationObserver(
          debounce((mutations) => {
            const element = container.querySelector(selector)
            if (element) {
              resolve(element)
              observer.disconnect()
            }
          }, 0)
        )

        observer.observe(container, {
          childList: true,
          subtree: true
        })
      })
    },
    [containerRef]
  )

  useEffect(() => {
    if (blockId && containerRef?.current) {
      waitForElm(`[data-block-id='${blockId}']`).then((element: Element) => {
        scrollIntoView(element, {
          scrollMode: 'always',
          block: 'center',
          // behavior: 'smooth',
          inline: 'nearest',
          boundary: containerRef.current
        })
      })
    }
  }, [blockId, containerRef, waitForElm])
}
