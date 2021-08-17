import SelectionArea from '@tellery/viselect-vanilla'
import { memoize } from 'lodash'
import { useDebugValue, useEffect, useRef, useState } from 'react'

const getBlockId = memoize((element: HTMLElement) => {
  return element.dataset.blockId as string
})

export function useSelectionArea(selectBlocks: (blockIds: string[] | null) => void) {
  const selectionRef = useRef<SelectionArea | null>(null)
  const [selecting, setSelecting] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useDebugValue('useSelectionArea')

  useEffect(() => {
    const selection = (
      new SelectionArea({
        // document: window.document,
        selectionAreaClass: 'selection-area',
        container: '.editor',
        // container: '.editor-content',
        selectables: ['.block-selectble'],
        startareas: ['.editor'],
        boundaries: ['.editor'],
        behaviour: {
          startThreshold: 50,
          overlap: 'keep',
          intersect: 'touch',
          scrolling: {
            speedDivider: 10,
            manualSpeed: 750,
            boundary: 50
          }
        },
        features: {
          touch: false,
          singleTap: {
            allow: false,
            intersect: 'native'
          },
          range: true
        }
      }) as SelectionArea
    )
      .on('beforestart', ({ event }) => {
        const noSelect = event?.composedPath().find((element) => (element as Element).classList?.contains('no-select'))

        containerRef.current = (event?.target as HTMLElement).closest('.editor')

        setSelecting(false)
        selection.clearSelection()

        if ((event as MouseEvent)?.button !== 0 || noSelect) {
          return false
        }

        selectBlocks(null)
        return true
      })
      .on('start', () => {
        setSelecting(true)
        selection.clearSelection()
      })
      .on('move', ({ store: { selected, changed } }) => {
        if (changed.added.length || changed.removed.length) {
          selectBlocks(selected.map((element) => getBlockId(element as HTMLElement)))
        }
      })
      .on('stop', () => {
        setSelecting(false)
        selection.clearSelection()
      })
    selectionRef.current = selection
    return () => {
      selection.destroy()
      selectBlocks(null)
      selectionRef.current = null
    }
  }, [selectBlocks])

  return { selectionRef, selecting }
}
