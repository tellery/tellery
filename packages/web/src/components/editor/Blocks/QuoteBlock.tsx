import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import React from 'react'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { BlockComponent } from './utils'

const _QuoteBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
  }>
> = ({ block, children }) => {
  const { readonly } = useBlockBehavior()

  return (
    <>
      <div
        className={cx(
          css`
            font-size: 1em;
            padding-left: 13px;
            border-left: 2px solid ${ThemingVariables.colors.primary[1]};
            margin-left: 9px;
          `
        )}
      >
        <ContentEditable block={block} readonly={readonly}></ContentEditable>
      </div>
      {children}
    </>
  )
}

_QuoteBlock.meta = {
  isText: true,
  hasChildren: false
}
export const QuoteBlock = _QuoteBlock
