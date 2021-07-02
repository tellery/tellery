import { css } from '@emotion/css'
import React, { ReactNode, useEffect, useRef } from 'react'
import { Editor } from 'types'
import { ContentEditable, EditableRef } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../ContentBlock'
import { useEditor } from '../hooks'

export const TextBlock: React.FC<{
  block: Editor.Block
  children: ReactNode
}> = ({ block, children }) => {
  const editor = useEditor()
  const editableRef = useRef<EditableRef>(null)
  const { readonly } = useBlockBehavior()

  useEffect(() => {
    editor?.registerOrUnregisterBlockInstance(block.id, {
      openMenu: () => {
        editableRef?.current?.openSlashCommandMenu()
      }
    })
  }, [block.id, editor])

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

export const TEXT_BLOCK_CLASS = new Map([
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
