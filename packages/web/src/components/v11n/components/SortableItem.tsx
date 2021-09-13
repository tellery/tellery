import { css } from '@emotion/css'
import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconCommonHandler } from '@app/assets/icons'
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
        position: relative;
        display: inline-flex;
        align-items: center;
        background-color: ${ThemingVariables.colors.gray[5]};
        border-radius: 4px;
        height: 32px;
        width: 100%;
        :hover {
          background-color: ${ThemingVariables.colors.primary[5]};
        }
        :hover > svg {
          opacity: 1;
        }
      `}
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <IconCommonHandler
        color={ThemingVariables.colors.gray[0]}
        className={css`
          position: absolute;
          left: -10px;
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
