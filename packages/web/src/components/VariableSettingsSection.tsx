import { useBlockSuspense } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import styled from '@emotion/styled'
import React, { useCallback } from 'react'
import FormInput from './kit/FormInput'

const SectionHeader = styled.div`
  font-family: Helvetica Neue;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 15px;
  color: ${ThemingVariables.colors.text[0]};
  padding: 17px 16px 8px;
`
const Label = styled.div`
  font-family: Helvetica Neue;
  font-style: normal;
  font-weight: normal;
  font-size: 12px;
  line-height: 14px;
  color: ${ThemingVariables.colors.text[1]};
  padding-left: 6px;
`
const FormItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 10px;
  align-items: center;
`
const VariableFormInput = styled(FormInput)`
  width: 100px;
  height: 32px;
  padding: 0 8px;
`

export const VariableSettingsSection: React.FC<{ storyId: string; blockId: string }> = ({ storyId, blockId }) => {
  const block = useBlockSuspense<Editor.ControlBlock>(blockId)
  const blockTranscations = useBlockTranscations()
  const handleUpdateVariableName = useCallback(
    (value: string) => {
      blockTranscations.updateBlockProps(block.storyId!, block.id, ['content', 'name'], value)
    },
    [block.id, block.storyId, blockTranscations]
  )

  const handleUpdateDefaultValue = useCallback(
    (value: string) => {
      blockTranscations.updateBlockProps(block.storyId!, block.id, ['content', 'defaultValue'], value)
    },
    [block.id, block.storyId, blockTranscations]
  )

  return (
    <div>
      <SectionHeader>Settings</SectionHeader>
      <FormItem>
        <Label>Variable name</Label>
        <VariableFormInput
          value={block.content.name}
          onChange={(e) => {
            handleUpdateVariableName(e.currentTarget.value)
          }}
        ></VariableFormInput>
      </FormItem>
      {/* <FormItem>
        <Label>Variable type</Label>
        <VariableFormInput></VariableFormInput>
      </FormItem> */}
      {/* <FormItem>
        <Label>Value hint</Label>
        <VariableFormInput></VariableFormInput>
      </FormItem> */}
      <FormItem>
        <Label>Default value</Label>
        <VariableFormInput
          value={block.content.defaultValue}
          onChange={(e) => {
            handleUpdateDefaultValue(e.currentTarget.value)
          }}
        ></VariableFormInput>
      </FormItem>
    </div>
  )
}
