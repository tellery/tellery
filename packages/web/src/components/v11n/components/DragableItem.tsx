import { css } from '@emotion/css'
import type { ReactNode } from 'react'
import { SortableElement, SortableHandle } from 'react-sortable-hoc'

import { IconCommonDrag } from 'assets/icons'
import { ThemingVariables } from 'styles'
import Icon from 'components/kit/Icon'

const DragHandle = SortableHandle(() => (
  <div
    className={css`
      height: 30px;
      width: 16px;
      padding: 5px 0;

      opacity: 0;
      transition: opacity 0.35s;
      cursor: grab;
    `}
  >
    <Icon
      icon={IconCommonDrag}
      color={ThemingVariables.colors.gray[0]}
      className={css`
        margin: 0 -2px;
      `}
    />
  </div>
))

export const DragableItem = SortableElement((props: { children: ReactNode }) => (
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

      &:hover,
      &:active {
        & > div:nth-child(1) {
          opacity: 1;
        }
      }
    `}
  >
    <DragHandle />
    {props.children}
  </div>
))
