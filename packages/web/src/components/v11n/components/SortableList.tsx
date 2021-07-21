import { ReactNode, useCallback, useMemo } from 'react'
import { SortableItem } from './SortableItem'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'

function getKey<T extends string | { key: string }>(item: T): string {
  return typeof item === 'string' ? item : (item as { key: string }).key
}

export function SortableList<T extends string | { key: string }>(props: {
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
  const items = useMemo(
    () => props.value.map((item) => (typeof item === 'string' ? item : { ...(item as object), id: item.key })),
    [props.value]
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items}>
        {props.value.map((item) => {
          const key = getKey(item)
          return (
            <SortableItem key={key} id={key}>
              {props.renderItem(item)}
            </SortableItem>
          )
        })}
      </SortableContext>
      {props.footer}
    </DndContext>
  )
}
