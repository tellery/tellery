import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React, { ReactNode } from 'react'

export const SideBarContentLayout: React.FC<{ title: ReactNode }> = ({ title, children }) => {
  return (
    <>
      <div
        className={css`
          padding: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <div
          className={css`
            font-style: normal;
            font-weight: bold;
            font-size: 24px;
            line-height: 29px;
            color: ${ThemingVariables.colors.text[0]};
            flex-grow: 0;
            flex-shrink: 0;
            padding: 36px 16px 10px 16px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          `}
        >
          {title}
        </div>
        <div
          className={css`
            flex: 1;
            overflow-y: hidden;
          `}
        >
          {children}
        </div>
      </div>
    </>
  )
}
