import { css } from '@emotion/css'
import React, { ReactNode, useImperativeHandle, useRef } from 'react'
import { Editor } from 'types'
import { ContentEditable, EditableRef } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { BlockComponent, registerBlock } from './utils'

interface TextBlockProps {
  block: Editor.Block
  children: ReactNode
}

const _TextBlock: React.ForwardRefRenderFunction<any, TextBlockProps> = ({ block, children }, ref) => {
  const editableRef = useRef<EditableRef>(null)
  const { readonly } = useBlockBehavior()

  useImperativeHandle(
    ref,
    () => ({
      openMenu: () => {
        editableRef?.current?.openSlashCommandMenu()
      }
    }),
    []
  )

  return (
    <>
      <ContentEditable
        block={block}
        className={TEXT_BLOCK_CLASS.get(block.type)}
        ref={editableRef}
        readonly={readonly}
      ></ContentEditable>
      {children}
    </>
  )
}

const TextBlock = React.forwardRef(_TextBlock) as BlockComponent<
  React.ForwardRefExoticComponent<TextBlockProps & React.RefAttributes<any>>
>

TextBlock.meta = {
  isText: true,
  hasChildren: true,
  forwardRef: true
}

const TEXT_BLOCK_CLASS = new Map([
  [
    Editor.BlockType.Header,
    css`
      font-weight: 600;
      line-height: 1.2;
      /* padding: 3px 0; */
      font-size: 1.875em;
    `
  ],
  [
    Editor.BlockType.SubHeader,
    css`
      font-weight: 600;
      line-height: 1.2;
      /* padding: 3px 0; */
      font-size: 1.5em;
    `
  ],
  [
    Editor.BlockType.SubSubHeader,
    css`
      font-weight: 600;
      line-height: 1.2;
      /* padding: 3px 0; */
      font-size: 1.25em;
    `
  ],
  [
    Editor.BlockType.Text,
    css`
      font-weight: 400;
      line-height: 1.5;
      /* padding: 3px 0; */
      font-size: 1em;
    `
  ]
])

registerBlock(Editor.BlockType.Text, TextBlock)
registerBlock(Editor.BlockType.Header, TextBlock)
registerBlock(Editor.BlockType.SubHeader, TextBlock)
registerBlock(Editor.BlockType.SubSubHeader, TextBlock)
