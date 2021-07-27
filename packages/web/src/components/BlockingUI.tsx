import { css } from '@emotion/css'
import React, { ReactNode } from 'react'
import { ThemingVariables } from '@app/styles'
import { CircularLoading } from './CircularLoading'

export const BlockingUI = (props: { blocking: boolean; children?: ReactNode; size?: number }) => {
  const { blocking, size = 50 } = props
  return (
    <>
      {blocking ? (
        <div
          className={css`
            width: 100%;
            height: 100%;
            bottom: 0;
            left: 0;
            right: 0;
            top: 0;
            z-index: 100;
            position: absolute;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <CircularLoading size={size} color={ThemingVariables.colors.gray[0]} />
        </div>
      ) : null}
      {props.children}
    </>
  )
}
