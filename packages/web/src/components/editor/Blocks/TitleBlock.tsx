import { css, cx } from '@emotion/css'
import React from 'react'
import { Editor } from 'types'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { BlockComponent, registerBlock } from './utils'

export const TitleBlock: BlockComponent<React.FC<{ block: Editor.Block }>> = (props: { block: Editor.Block }) => {
  const { readonly } = useBlockBehavior()

  const { block } = props
  if (!block) return null
  return (
    <div
      data-block-id={block.id}
      className={cx(
        css`
          position: relative;
          font-size: 2em;
          font-weight: bold;
          box-sizing: border-box;
          border: solid 1px transparent;
          outline: none;
          max-width: 100%;
          width: 100%;
          margin: 0 auto 20px auto;
          white-space: pre-wrap;
          word-break: break-word;
          caret-color: rgb(55, 53, 47);
          text-align: left;
        `,
        'tellery-block'
      )}
    >
      {block && (
        <ContentEditable
          disableReferenceDropdown
          disableSlashCommand
          disableTextToolBar
          block={block}
          placeHolderStrategy="always"
          placeHolderText="Untitled"
          readonly={readonly}
        />
      )}
    </div>
  )
}

TitleBlock.meta = {
  isText: true,
  hasChildren: true
}

registerBlock(Editor.BlockType.Story, TitleBlock)
