import { css, cx } from '@emotion/css'
import React, { ReactNode } from 'react'
import { IconCommonDot } from '@app/assets/icons'
import { Editor } from '@app/types'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { BlockComponent } from './utils'

const _BulletListBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
    children: ReactNode
  }>
> = ({ block, children }) => {
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

_BulletListBlock.meta = {
  isText: true,
  hasChildren: true
}

export const BulletListBlock = _BulletListBlock
