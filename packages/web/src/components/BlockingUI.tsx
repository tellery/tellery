import { css } from '@emotion/css'
import React, { ReactNode } from 'react'
import { ThemingVariables } from 'styles'
import { CircularLoading } from './CircularLoading'

export const BlockingUI = (props: { blocking: boolean; children?: ReactNode }) => {
  const { blocking } = props
  return (
    <>
      {blocking ? (
        <div
          className={css`
            width: 100%;
            height: calc(100vh - 48px);
            bottom: 0;
            left: 0;
            right: 0;
            top: 0;
            z-index: 100;
            position: absolute;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <CircularLoading size={80} color={ThemingVariables.colors.gray[0]} />
        </div>
      ) : null}
      {props.children}
    </>
  )
}
