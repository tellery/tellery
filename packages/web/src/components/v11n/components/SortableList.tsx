import { ReactNode, useCallback } from 'react'
import { SortableItem } from './SortableItem'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'

function getKey<T extends string | { id: string }>(item: T): string {
  return typeof item === 'string' ? item : (item as { id: string }).id
}

export function SortableList<T extends string | { id: string }>(props: {
  className?: string
  value: T[]
  onChange(value: T[]): void
  renderItem(value: T): ReactNode
  footer?: ReactNode
}) {
  const { onChange } = props
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (active.id !== over?.id) {
        const oldIndex = props.value.findIndex((item) => getKey(item) === active.id)
        const newIndex = props.value.findIndex((item) => getKey(item) === over?.id)
        onChange(arrayMove(props.value, oldIndex, newIndex))
      }
    },
    [onChange, props.value]
  )
  const sensors = useSensors(useSensor(PointerSensor))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={props.value}>
        {props.value.map((item) => {
          const key = getKey(item)
          return (
            <SortableItem key={key} id={key}>
              {props.renderItem(item)}
            </SortableItem>
          )
        })}
      </SortableContext>
    </DndContext>
  )
}
