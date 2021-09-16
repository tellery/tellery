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
  const variableName = block.content.name ?? block.id
  const [variableValue, setVariableValue] = useVariable(block.storyId!, variableName)

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

  const setDefaultValue = useCallback(
    (value: unknown) => {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'defaultValue'], value)
      setVariableValue(value)
    },
    [block.id, block.storyId, blockTranscation, setVariableValue]
  )

  return (
    <div
      className={css`
        display: flex;
      `}
    >
      name:
      <input
        onChange={(e) => {
          blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'name'], e.currentTarget.value)
        }}
        value={variableName}
      />
      value:
      {block.content.type === 'text' && (
        <input
          onBlur={(e) => {
            submitChange(e.currentTarget.value)
          }}
          // value={variableValue as string}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.shiftKey === false) {
              e.preventDefault()
              e.stopPropagation()
              submitChange(e.currentTarget.value)
            } else if (e.key === 'Enter' && e.shiftKey === true) {
              e.preventDefault()
              e.stopPropagation()
              setDefaultValue(e.currentTarget.value)
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

registerBlock(Editor.BlockType.Control, ControlBlock)
