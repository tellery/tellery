import { IconCommonClose, IconCommonEdit, IconCommonEnter } from '@app/assets/icons'
import { DetectableOverflow } from '@app/components/DetectableOverflow'
import { VariableDatePicker } from '@app/components/VariableSettingsSection'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useSearchParamsState } from '@app/hooks/useSearchParamsState'
import { useSideBarVariableEditor } from '@app/hooks/useSideBarQuestionEditor'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QueryBlockSelectInput } from '../../QueryBlockSelectInput'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { useVariableState } from '../hooks/useVariable'
import { BlockComponent } from './utils'

const StyledInput = styled.input`
  outline: none;
  border-radius: 5px;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 8px;
  background: transparent;
`

const useVariableName = (block: Editor.ControlBlock) => {
  const blockTranscation = useBlockTranscations()
  const setVariableName = useCallback(
    (value: string) => {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'name'], value)
    },
    [block.id, block.storyId, blockTranscation]
  )

  return useMemo(
    () => [block.content.name ?? block.id, setVariableName] as [string, (value: string) => void],
    [block.content.name, block.id, setVariableName]
  )
}

const _ControlBlock: BlockComponent<
  React.FC<{
    children: React.ReactNode
    block: Editor.ControlBlock
    blockFormat: BlockFormatInterface
    parentType: Editor.BlockType
  }>
> = ({ block, blockFormat, parentType }) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const variableNameInputRef = useRef<HTMLInputElement | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)
  const [variableName, setVariableName] = useVariableName(block)
  const [variable, setVariable] = useVariableState(block.storyId!, variableName)
  const defaultRawValue = block.content.defaultValue
  const isDefaultValue = variable.isDefault
  const sideBarVariableEditor = useSideBarVariableEditor(block.storyId!)
  const [valueEditing, setValueEditing] = useState(false)
  const [editingValue, setEditingValue] = useSearchParamsState(variableName, defaultRawValue)

  const submitChange = useCallback(
    (type: string, value: string) => {
      setEditingValue(value)
      setVariable(value)
    },
    [setEditingValue, setVariable]
  )

  useEffect(() => {
    if (!inputRef.current) return
    if (editingValue !== undefined) {
      inputRef.current.value = editingValue
      submitChange(block.content.type, editingValue)
    }
  }, [block.content.type, editingValue, submitChange, titleEditing])

  const onValueInputKeydown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        submitChange(block.content.type, e.currentTarget.value)
        e.currentTarget.blur()
      } else {
        e.stopPropagation()
      }
    },
    [submitChange, block.content.type]
  )

  const onBlur = useCallback(
    (e) => {
      e.currentTarget.value = editingValue
      setValueEditing(false)
    },
    [editingValue]
  )

  const [disableTippy, setDisableTippy] = useState(true)

  return (
    <Tippy content={'Right-click to edit'} placement="right" delay={500}>
      <div
        className={css`
          display: flex;
          max-width: 316px;
          max-width: min(316px, 100%);
          height: 36px;
          align-items: center;
          border: solid 2px ${isDefaultValue ? ThemingVariables.colors.primary[0] : ThemingVariables.colors.primary[2]};
          border-radius: 4px;
        `}
        onContextMenuCapture={(e) => {
          e.stopPropagation()
          e.preventDefault()
          sideBarVariableEditor.open({ blockId: block.id, activeTab: 'Variable' })
        }}
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
            top: -6px;
            left: 10px;
            position: absolute;
            font-size: 12px;
            font-weight: 700;
            color: ${ThemingVariables.colors.primary[0]};
            background: ${ThemingVariables.colors.gray[5]};
            display: inline-flex;
            align-items: center;
          `}
        >
          {titleEditing ? (
            <>Variable Name</>
          ) : (
            <>
              <DetectableOverflow
                className={css`
                  padding-left: 5px;
                `}
                onChange={(overflowed) => {
                  setDisableTippy(!overflowed)
                }}
              >
                <span>{variableName}</span>
              </DetectableOverflow>
              <IconCommonEdit
                className={cx(
                  css`
                    height: 12px;
                    padding: 0 2px;
                    cursor: pointer;
                    /* opacity: 0; */
                    transition: all 250ms; ;
                  `,
                  'icon-common-edit'
                )}
                onClick={() => {
                  setTitleEditing(true)
                  setTimeout(() => {
                    if (variableNameInputRef.current) {
                      variableNameInputRef.current.value = variableName
                      variableNameInputRef.current?.focus()
                    }
                  }, 0)
                }}
              />
            </>
          )}
          {/* <Tippy content={variableName} disabled={disableTippy}>
          <input
            className={css`
              outline: none;
              border: none;
              background-color: transparent;
              width: 100%;
              height: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              padding-left: 5px;
            `}
            placeholder="input text"
            onChange={(e) => {
              blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'name'], e.currentTarget.value)
            }}
            value={variableName}
          />
        </Tippy> */}
        </div>
        {titleEditing ? (
          <div
            className={css`
              flex: 4;
              display: flex;
              padding: 2px 0;
              > input {
                flex: 1;
              }
            `}
          >
            <StyledInput
              onBlur={() => {
                setTitleEditing(false)
              }}
              ref={variableNameInputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  setVariableName(e.currentTarget.value)
                  setTitleEditing(false)
                  e.currentTarget.blur()
                } else {
                  e.stopPropagation()
                }
              }}
            />
            <div
              className={css`
                padding: 0 10px;
              `}
            >
              <IconCommonEnter />
            </div>
          </div>
        ) : (
          <>
            <div
              className={css`
                flex: 4;
                padding: 2px 0;
                height: 100%;
                margin-left: 2px;
                /* overflow: hidden; */
              `}
            >
              {(block.content.type === 'text' || block.content.type === 'macro') && (
                <StyledInput
                  onBlur={onBlur}
                  onInput={() => {
                    setValueEditing(true)
                  }}
                  ref={inputRef}
                  onKeyDown={onValueInputKeydown}
                />
              )}
              {block.content.type === 'transclusion' && (
                <>
                  <QueryBlockSelectInput
                    onChange={(blockId: string) => {
                      submitChange(block.content.type, blockId)
                    }}
                    value={variable.currentRawValue as string | null}
                  />
                </>
              )}
              {(block.content.type === 'number' || block.content.type === 'decimal') && (
                <StyledInput
                  onBlur={onBlur}
                  onInput={() => {
                    setValueEditing(true)
                  }}
                  placeholder="input decimal number"
                  type="number"
                  ref={inputRef}
                  onKeyDown={onValueInputKeydown}
                />
              )}
              {block.content.type === 'float' && (
                <StyledInput
                  onBlur={onBlur}
                  onInput={() => {
                    setValueEditing(true)
                  }}
                  placeholder="input float number"
                  type="text"
                  ref={inputRef}
                  onKeyDown={onValueInputKeydown}
                />
              )}
              {block.content.type === 'date' && (
                <div
                  className={css`
                    height: 100%;
                    width: 100%;
                    .react-date-picker {
                      height: 100%;
                      width: 100%;
                    }
                  `}
                >
                  <VariableDatePicker
                    className={css`
                      height: 100%;
                      width: 100%;
                      border: none;
                    `}
                    value={variable.currentRawValue}
                    setValue={(value: string) => submitChange(block.content.type, value)}
                  />
                </div>
              )}
            </div>
            <div
              className={css`
                display: flex;
                padding: 10px;
                color: ${ThemingVariables.colors.gray[0]};
              `}
            >
              {valueEditing === true ? (
                <IconCommonEnter />
              ) : (
                isDefaultValue === false && (
                  <IconCommonClose
                    className={css`
                      cursor: pointer;
                    `}
                    onClick={() => {
                      submitChange(block.content.type, defaultRawValue)
                    }}
                  />
                )
              )}
            </div>
          </>
        )}
      </div>
    </Tippy>
  )
}

_ControlBlock.meta = {
  isText: false,
  hasChildren: false,
  isResizeable: false
}

export const ControlBlock = _ControlBlock
