/* eslint-disable no-use-before-define */
import VanillaSelectionArea from '@tellery/viselect-vanilla'
import type { SelectionEvents, SelectionOptions } from '@tellery/viselect-vanilla'
import React, { createRef, useEffect } from 'react'

export interface SelectionAreaProps extends Omit<Partial<SelectionOptions>, 'boundaries'> {
  className?: string
  onBeforeStart?: SelectionEvents['beforestart']
  onStart?: SelectionEvents['start']
  onMove?: SelectionEvents['move']
  onStop?: SelectionEvents['stop']
}

export const SelectionArea: React.FunctionComponent<SelectionAreaProps> = (props) => {
  const root = createRef<HTMLDivElement>()

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const { onBeforeStart, onStart, onMove, onStop, ...opt } = props
    const areaBoundaries = root.current as HTMLElement

    const selection = new VanillaSelectionArea({
      boundaries: areaBoundaries,
      ...opt
    })

    onBeforeStart && selection.on('beforestart', onBeforeStart)
    onStart && selection.on('start', onStart)
    onMove && selection.on('move', onMove)
    onStop && selection.on('stop', onStop)

    return () => selection.destroy()
  }, [])

  return (
    <div ref={root} className={props.className}>
      {props.children}
    </div>
  )
}
