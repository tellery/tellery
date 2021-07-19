import { css } from '@emotion/css'
import React from 'react'
import { ThemingVariables } from 'styles'
import { Editor } from 'types'
import { BlockComponent, registerBlock } from './utils'

export const DividerBlock: BlockComponent<
  React.FC<{
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

DividerBlock.meta = {
  isText: false,
  hasChildren: false
}

registerBlock(Editor.BlockType.Code, DividerBlock)
