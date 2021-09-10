// import { CircularLoading } from '@app/components/CircularLoading'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { useEffect, useRef, useCallback } from 'react'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { useVariable } from '../hooks/useVariable'
import { BlockComponent, registerBlock } from './utils'

const ControlBlock: BlockComponent<
  React.FC<{
    block: Editor.ControlBlock
    blockFormat: BlockFormatInterface
    parentType: Editor.BlockType
  }>
> = ({ block, blockFormat, parentType }) => {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const { readonly } = useBlockBehavior()
  const workspace = useWorkspace()
  const blockTranscation = useBlockTranscations()
  const [variableValue, setVariableValue] = useVariable(block.storyId!, block.content.name ?? block.id)

  useEffect(() => {
    if (!block.content.name) {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'name'], block.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (variableValue === undefined && block.content.defaultValue) {
      setVariableValue(block.content.defaultValue)
    }
  }, [block.content.defaultValue, setVariableValue, variableValue])

  const submitChange = useCallback(
    (value: unknown) => {
      setVariableValue(value)
    },
    [setVariableValue]
  )

  return (
    <div
      className={css`
        display: flex;
        justify-content: center;
      `}
    >
      {block.content.type === 'text' && (
        <input
          onBlur={(e) => {
            submitChange(e.currentTarget.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.shiftKey === false) {
              e.preventDefault()
              e.stopPropagation()
              submitChange(e.currentTarget.value)
            }
          }}
        />
      )}
    </div>
  )
}

ControlBlock.meta = {
  isText: false,
  hasChildren: false,
  isResizeable: false
}

registerBlock(Editor.BlockType.Image, ControlBlock)
