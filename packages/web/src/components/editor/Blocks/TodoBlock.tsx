import { CheckBox } from '@app/components/CheckBox'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import React, { useCallback } from 'react'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { BlockComponent, registerBlock } from './utils'

const TodoBlock: BlockComponent<
  React.FC<{
    block: Editor.TodoBlock
  }>
> = ({ block, children }) => {
  const { readonly } = useBlockBehavior()
  const blockTranscation = useBlockTranscations()
  return (
    <>
      <div
        className={cx(
          css`
            display: flex;
            line-height: var(--line-height);
          `,
          block.content?.checked &&
            css`
              text-decoration: line-through;
              color: ${ThemingVariables.colors.text[1]};
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
          <CheckBox
            disabled={readonly}
            value={!!block.content?.checked}
            onChange={useCallback(() => {
              blockTranscation.updateBlockProps(
                block.storyId!,
                block.id,
                ['content', 'checked'],
                !block.content?.checked
              )
            }, [block.content?.checked, block.id, block.storyId, blockTranscation])}
          />
        </div>

        <ContentEditable block={block} readonly={readonly}></ContentEditable>
      </div>
      {children}
    </>
  )
}

TodoBlock.meta = {
  isText: true,
  hasChildren: true
}

registerBlock(Editor.BlockType.Todo, TodoBlock)
