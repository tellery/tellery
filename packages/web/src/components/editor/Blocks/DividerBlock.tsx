import { css } from '@emotion/css'
import React from 'react'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { BlockComponent } from './utils'

const _DividerBlock: BlockComponent<
  ReactFCWithChildren<{
    block: Editor.Block
  }>
> = ({ children }) => {
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

_DividerBlock.meta = {
  isText: false,
  hasChildren: false
}

export const DividerBlock = _DividerBlock
