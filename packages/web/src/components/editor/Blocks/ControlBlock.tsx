// import { CircularLoading } from '@app/components/CircularLoading'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { useEffect, useRef, useCallback } from 'react'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { useVariable } from '../hooks/useVariable'
import { BlockComponent, registerBlock } from './utils'
import Tippy from '@tippyjs/react'

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
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blockTranscation = useBlockTranscations()
  const variableName = block.content.name ?? block.id
  const [variableValue, setVariableValue] = useVariable(block.storyId!, variableName)
  const defaultValue = block.content.defaultValue
  const isDefaultValue = defaultValue === variableValue

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.value = defaultValue
  }, [defaultValue])

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
        flex-direction: column;
        max-width: 150px;
      `}
    >
      <div>
        variable name:
        <input
          className={css`
            outline: none;
            background-color: ${ThemingVariables.colors.gray[5]};
            border-radius: 5px;
            border: 1px solid ${ThemingVariables.colors.gray[1]};
          `}
          onChange={(e) => {
            blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'name'], e.currentTarget.value)
          }}
          value={variableName}
        />
      </div>
      <div>
        value:
        <Tippy
          content={' Press Enter to confirm, Shift+Enter to set as default value'}
          placement="left"
          trigger="focusin"
        >
          <div>
            {block.content.type === 'text' && (
              <input
                onBlur={(e) => {
                  submitChange(e.currentTarget.value)
                }}
                ref={inputRef}
                style={{
                  border: `1px ${isDefaultValue ? 'solid' : 'dashed'} ${ThemingVariables.colors.gray[1]}`
                }}
                className={css`
                  outline: none;
                  background-color: ${ThemingVariables.colors.gray[5]};
                  border-radius: 5px;
                `}
                // value={variableValue as string}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.shiftKey === false) {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.blur()
                    submitChange(e.currentTarget.value)
                  } else if (e.key === 'Enter' && e.shiftKey === true) {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.blur()
                    setDefaultValue(e.currentTarget.value)
                  } else {
                    e.stopPropagation()
                  }
                }}
              />
            )}
          </div>
        </Tippy>
      </div>
    </div>
  )
}

ControlBlock.meta = {
  isText: false,
  hasChildren: false,
  isResizeable: false
}

registerBlock(Editor.BlockType.Control, ControlBlock)
