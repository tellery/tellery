import { css } from '@emotion/css'
import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconCommonDrag } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'

import { useMemo } from 'react'

export function SortableItem(props: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })
  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition: transition ?? undefined
    }),
    [transform, transition]
  )

  return (
    <div
      className={css`
        display: inline-flex;
        align-items: center;
        border: 1px solid ${ThemingVariables.colors.gray[1]};
        border-radius: 8px;
        background-color: ${ThemingVariables.colors.gray[5]};
        overflow: hidden;
        height: 36px;
        width: 185px;
        margin: 5px;

        &:hover > svg {
          opacity: 1;
        }
      `}
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <IconCommonDrag
        color={ThemingVariables.colors.gray[0]}
        className={css`
          margin: 0 -2px;
          opacity: 0;
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
        `}
        {...listeners}
      />
      {props.children}
    </div>
  )
}
