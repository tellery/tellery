import { css, cx } from '@emotion/css'
import React from 'react'
import { ThemingVariables } from 'styles'
import type { Editor } from 'types'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../ContentBlock'

export const QuoteBlock: React.FC<{
  block: Editor.Block
}> = ({ block, children }) => {
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
