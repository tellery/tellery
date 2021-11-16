import { IconCommonSetting } from '@app/assets/icons'
import IconButton from '@app/components/kit/IconButton'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useSideBarVariableEditor } from '@app/hooks/useSideBarQuestionEditor'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import DetectableOverflow from 'react-detectable-overflow'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { useVariableCurrentValueState } from '../hooks/useVariable'
import { BlockComponent, registerBlock } from './utils'

const StyledInput = styled.input`
  outline: none;
  border-radius: 5px;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 8px;
`

const ControlBlock: BlockComponent<
  React.FC<{
    block: Editor.ControlBlock
    blockFormat: BlockFormatInterface
    parentType: Editor.BlockType
  }>
> = ({ block, blockFormat, parentType }) => {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blockTranscation = useBlockTranscations()
  const variableName = block.content.name ?? block.id
  const [variableValue, setVariableValue] = useVariableCurrentValueState(block.storyId!, variableName)
  const defaultValue = block.content.defaultValue
  const isDefaultValue = defaultValue === variableValue
  const sideBarVariableEditor = useSideBarVariableEditor(block.storyId!)

  useEffect(() => {
    if (!inputRef.current) return
    if (defaultValue !== undefined) {
      inputRef.current.value = defaultValue
    }
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

  const [disableTippy, setDisableTippy] = useState(true)

  return (
    <div
      className={css`
        display: flex;
        max-width: 316px;
        max-width: min(316px, 100%);
        height: 36px;
        background-color: ${ThemingVariables.colors.primary[0]};
        align-items: center;
        border-radius: 4px;
      `}
      onPaste={(e) => {
        e.stopPropagation()
      }}
      onCopy={(e) => {
        e.stopPropagation()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
    >
      <div
        className={css`
          max-width: 200px;
          min-width: 80px;
          position: relative;
        `}
      >
        <DetectableOverflow
          className={css`
            visibility: hidden;
            padding: 10px 13px;
          `}
          onChange={(overflowed) => {
            setDisableTippy(!overflowed)
          }}
        >
          {variableName}
        </DetectableOverflow>
        <Tippy content={variableName} disabled={disableTippy}>
          <input
            className={css`
              outline: none;
              border: none;
              background-color: transparent;
              color: ${ThemingVariables.colors.gray[5]};
              position: absolute;
              width: 100%;
              left: 0;
              top: 0;
              height: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              padding: 10px 13px;
              ::placeholder {
                color: ${ThemingVariables.colors.gray[5]};
              }
            `}
            placeholder="input text"
            onChange={(e) => {
              blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'name'], e.currentTarget.value)
            }}
            value={variableName}
          />
        </Tippy>
      </div>
      <div
        className={css`
          flex: 4;
          padding: 2px 0;
          height: 100%;
        `}
      >
        {(block.content.type === 'text' || block.content.type === 'transclusion') && (
          <StyledInput
            onBlur={(e) => {
              submitChange(e.currentTarget.value)
            }}
            ref={inputRef}
            // value={variableValue as string}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.blur()
                submitChange(e.currentTarget.value)
              } else {
                e.stopPropagation()
              }
            }}
          />
        )}
        {block.content.type === 'number' && (
          <StyledInput
            onBlur={(e) => {
              const value = parseInt(e.currentTarget.value, 10)
              submitChange(value)
            }}
            placeholder="input number"
            type="number"
            ref={inputRef}
            onKeyDown={(e) => {
              const value = parseInt(e.currentTarget.value, 10)
              if (e.key === 'Enter' && e.shiftKey === false) {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.blur()
                submitChange(value)
              } else {
                e.stopPropagation()
              }
            }}
          />
        )}
      </div>
      <div
        className={css`
          display: flex;
          padding: 10px;
        `}
      >
        <IconButton
          icon={IconCommonSetting}
          color={ThemingVariables.colors.gray[5]}
          onClick={(e) => {
            e.preventDefault()
            sideBarVariableEditor.open({ blockId: block.id, activeTab: 'Variable' })
          }}
        />
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
