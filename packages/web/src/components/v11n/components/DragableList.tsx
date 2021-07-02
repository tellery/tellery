import { ReactNode, useCallback } from 'react'
import { SortableContainer } from 'react-sortable-hoc'
import arrayMove from 'array-move'

import { DragableItem } from './DragableItem'

const Container = SortableContainer((props: { className?: string; children: ReactNode }) => (
  <div className={props.className}>{props.children}</div>
))

export function DragableList<T extends string | { key: string }>(props: {
  className?: string
  value: T[]
  onChange(value: T[]): void
  renderItem(value: T): ReactNode
  footer?: ReactNode
}) {
  const { onChange } = props
  const onDragEnd = useCallback(
    ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      onChange(arrayMove(props.value, oldIndex, newIndex))
    },
    [onChange, props.value]
  )

  return (
    <Container className={props.className} onSortEnd={onDragEnd} useDragHandle={true} axis="xy">
      {props.value.map((item, index) => {
        const key = typeof item === 'string' ? item : (item as { key: string }).key
        return (
          <DragableItem key={key} index={index}>
            {props.renderItem(item)}
          </DragableItem>
        )
      })}
      {props.footer}
    </Container>
  )
}
