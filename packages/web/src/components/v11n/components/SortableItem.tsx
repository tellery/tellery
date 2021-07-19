import { css } from '@emotion/css'
import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconCommonDrag } from 'assets/icons'
import { ThemingVariables } from 'styles'
import Icon from 'components/kit/Icon'
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
        z-index: 10000;

        &:hover > span {
          opacity: 1;
        }
      `}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Icon
        icon={IconCommonDrag}
        color={ThemingVariables.colors.gray[0]}
        className={css`
          margin: 0 -2px;
          opacity: 0;
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
        `}
      />
      {props.children}
    </div>
  )
}
