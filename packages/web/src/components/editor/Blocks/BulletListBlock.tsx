import { css, cx } from '@emotion/css'
import React, { ReactNode } from 'react'
import { IconCommonDot } from 'assets/icons'
import type { Editor } from 'types'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'

export const BulletListBlock: React.FC<{
  block: Editor.Block
  children: ReactNode
}> = ({ block, children }) => {
  const { readonly } = useBlockBehavior()

  return (
    <>
      <div
        className={cx(
          css`
            display: flex;
            line-height: var(--line-height);
          `
        )}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
            height: var(--line-height-em);
            width: 1.5em;
          `}
        >
          <IconCommonDot
            className={css`
              flex-shrink: 0;
              user-select: none;
              margin-right: 4px;
              margin-top: 2px;
            `}
          />
        </div>
        <ContentEditable block={block} readonly={readonly}></ContentEditable>
      </div>
      {children}
    </>
  )
}
