import React, { useEffect, useState } from 'react'

export const useEditableContextMenu = (
  open: boolean,
  actions: Function[],
  element: React.MutableRefObject<HTMLDivElement | null>
) => {
  const [index, setIndex] = useState(-1)

  useEffect(() => {
    setIndex(-1)
  }, [actions])

  useEffect(() => {
    if (!open) return
    const currentElement = element.current
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          setIndex((_index) => {
            const length = actions?.length || 0
            return _index >= length - 1 ? length - 1 : _index + 1
          })
          break
        }
        case 'ArrowUp': {
          setIndex((_index) => {
            return _index <= 1 ? 0 : _index - 1
          })
          break
        }
        case 'Enter': {
          actions[Math.max(index, 0)]?.()
          e.preventDefault()
          e.stopPropagation()
          break
        }
      }
    }
    currentElement?.addEventListener('keydown', onKeyDown)
    return () => {
      currentElement?.removeEventListener('keydown', onKeyDown)
    }
  }, [setIndex, open, actions?.length, index, element, actions])

  return [index]
}
