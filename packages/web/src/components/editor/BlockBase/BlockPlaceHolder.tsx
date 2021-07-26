import { css } from '@emotion/css'
import React from 'react'
import { ThemingVariables } from '@app/styles'
import { CircularLoading } from '../../CircularLoading'

export const BlockPlaceHolder = (props: { onClick?: () => void; loading: boolean; text: string }) => {
  const { loading, text, ...rest } = props
  return (
    <div
      {...rest}
      className={css`
        height: 70px;
        width: 100%;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding-left: 25px;
        background: ${ThemingVariables.colors.primary[5]};
        border-radius: 10px;
        font-weight: 500;
        font-size: 20px;
        line-height: 24px;
        color: ${ThemingVariables.colors.primary[2]};
      `}
    >
      {loading ? <CircularLoading size={25} color={ThemingVariables.colors.primary[0]} /> : text}
    </div>
  )
}
