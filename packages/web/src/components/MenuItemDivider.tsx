import { css } from '@emotion/css'
import React from 'react'
import { ThemingVariables } from '@app/styles'

export const MenuItemDivider: ReactFCWithChildren = () => {
  return (
    <div
      className={css`
        border-top: 1px solid ${ThemingVariables.colors.gray[1]};
        margin: 8px 0;
      `}
    ></div>
  )
}
