import { css } from '@emotion/css'
import React from 'react'
import { ThemingVariables } from 'styles'
import type { Editor } from 'types'

export const DividerBlock: React.FC<{
  block: Editor.Block
}> = ({ children }) => {
  return (
    <>
      <div
        className={css`
          height: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        `}
      >
        <div
          className={css`
            height: 1px;
            background-color: ${ThemingVariables.colors.gray[1]};
          `}
        ></div>
      </div>
      {children}
    </>
  )
}
