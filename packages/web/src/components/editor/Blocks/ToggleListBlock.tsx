import { ToggleControl } from '@app/components/ToggleControl'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import invariant from 'invariant'
import React, { ReactNode, useCallback } from 'react'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { TellerySelectionType } from '../helpers/tellerySelection'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { useBlockLocalPreferences } from '../hooks/useBlockLocalPreferences'
import { BlockComponent, registerBlock } from './utils'

export const ToggleListBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
    children: ReactNode
  }>
> = ({ block, children }) => {
  const { readonly } = useBlockBehavior()
  const [isCollapsedLocalState, setIsCollapsedLocalState] = useBlockLocalPreferences(block.id, 'toggle', true)

  const editor = useEditor()
  const createFirstChild = useCallback<React.MouseEventHandler<HTMLDivElement>>(
    (e) => {
      e.stopPropagation()
      invariant(editor, 'editor context is null')
      const newBlock = editor?.insertNewEmptyBlock(Editor.BlockType.Text, block.id, 'child')
      invariant(newBlock, 'block not created')
      editor?.setSelectionState({
        type: TellerySelectionType.Inline,
        anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
        focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
        storyId: block.storyId!
      })
    },
    [block.id, block.storyId, editor]
  )

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
            height: var(--line-height-em);
            width: 1.5em;
          `}
        >
          <ToggleControl
            value={!isCollapsedLocalState}
            onChange={useCallback(() => {
              setIsCollapsedLocalState((value) => !value)
            }, [setIsCollapsedLocalState])}
          />
        </div>
        <ContentEditable block={block} readonly={readonly}></ContentEditable>
      </div>
      {(block.children === undefined || block.children.length === 0) && isCollapsedLocalState === false && (
        <div
          className={css`
            margin-left: 1.5em;
            color: ${ThemingVariables.colors.gray[1]};
            font-size: 1em;
            cursor: pointer;
            padding: 0 0.5em;
            :hover {
              background-color: ${ThemingVariables.colors.gray[4]};
            }
          `}
          onClick={createFirstChild}
        >
          Empty toggle. Click to create one.
        </div>
      )}
      {children && isCollapsedLocalState === false && children}
    </>
  )
}

ToggleListBlock.meta = {
  isText: true,
  hasChildren: true
}

registerBlock(Editor.BlockType.Toggle, ToggleListBlock)
