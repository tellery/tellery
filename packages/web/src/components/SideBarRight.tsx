import {
  IconCommonClose,
  IconCommonDataAsset,
  IconCommonDbt,
  IconCommonEdit,
  IconCommonLock,
  IconCommonSmartQuery,
  IconCommonSqlQuery
} from '@app/assets/icons'
import { useBlockSuspense } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import * as Tabs from '@radix-ui/react-tabs'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSideBarQuestionEditor, useSideBarRightState } from '../hooks/useSideBarQuestionEditor'
import { ContentEditablePureText, EditableSimpleRef } from './editor/BlockBase/ContentEditablePureText'
import IconButton from './kit/IconButton'
import { SideBarDataAssets } from './SideBarDataAssets'
import SideBarModeling from './SideBarModeling'
import SideBarSmartQuery from './SideBarSmartQuery'
import SideBarVisualization from './SideBarVisualization'
import { SideBarTabHeader } from './v11n/components/Tab'
import { VariableSettingsSection } from './VariableSettingsSection'

export const DefaultSideBar: ReactFCWithChildren<{ storyId: string }> = ({ storyId }) => {
  const { t } = useTranslation()

  return (
    <Tabs.Root asChild value="tab1">
      <div
        className={css`
          height: 100%;
          display: flex;
          background-color: #fff;
          flex-direction: column;
        `}
      >
        <Tabs.List
          className={css`
            border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
            overflow-x: auto;
            white-space: nowrap;
            padding-right: 16px;
            flex-shrink: 0;
          `}
        >
          <Tabs.Trigger
            value="tab1"
            asChild
            // selected={tab.selectedId === 'Data Assets'}
          >
            <SideBarTabHeader selected>{t<string>(`Data Assets`)}</SideBarTabHeader>
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content
          value="tab1"
          className={css`
            flex: 1;
            overflow: hidden;
          `}
        >
          <React.Suspense fallback={<></>}>
            <SideBarDataAssets storyId={storyId} />
          </React.Suspense>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  )
}

const BLOCKTYPE_ICON = {
  [Editor.BlockType.QueryBuilder]: IconCommonDataAsset,
  [Editor.BlockType.SnapshotBlock]: IconCommonLock,
  [Editor.BlockType.SmartQuery]: IconCommonSmartQuery,
  [Editor.BlockType.DBT]: IconCommonDbt,
  [Editor.BlockType.SQL]: IconCommonSqlQuery
}

export const QuestionTitleEditor: ReactFCWithChildren<{ blockId: string; storyId: string }> = ({
  blockId,
  storyId
}) => {
  const queryBlock = useBlockSuspense(blockId)
  const blockTranscation = useBlockTranscations()
  const setTitle = useCallback(
    (title: Editor.Token[]) => {
      blockTranscation.updateBlockProps(storyId, blockId, ['content', 'title'], title)
    },
    [blockId, blockTranscation, storyId]
  )
  const [titleEditing, setTitleEditing] = useState(false)
  const contentEditableRef = useRef<EditableSimpleRef | null>(null)
  const sideBarQuestionEditor = useSideBarQuestionEditor(storyId)
  const Icon = BLOCKTYPE_ICON[queryBlock.type as keyof typeof BLOCKTYPE_ICON]

  return (
    <div
      className={css`
        display: flex;
        min-height: 40px;
        padding: 0 10px;
        align-items: center;
        justify-content: flex-start;
        background-color: ${ThemingVariables.colors.gray[3]};
      `}
    >
      <div
        className={css`
          margin-right: 10px;
        `}
      >
        {Icon ? <Icon color={ThemingVariables.colors.text[0]} /> : null}
      </div>
      <ContentEditablePureText
        tokens={queryBlock?.content?.title}
        onChange={(tokens) => {
          setTitle(tokens)
        }}
        ref={contentEditableRef}
        disableEnter
        // readonly={!titleEditing}
        placeHolderStrategy="always"
        placeHolderText={DEFAULT_TITLE}
        textAlign="left"
        onConfirm={() => {
          setTitleEditing(false)
        }}
        onClick={() => {
          setTitleEditing(true)
        }}
        onBlur={() => {
          setTitleEditing(false)
        }}
        onFocus={() => {
          setTitleEditing(true)
        }}
        className={css`
          background: transparent;
          cursor: text;
          background: transparent;
          font-size: 20px;
          text-align: center;
          font-weight: 500;
          font-size: 14px;
          line-height: 24px;
          /* white-space: nowrap; */
          overflow-x: auto;
          max-width: 100%;
          color: ${ThemingVariables.colors.text[0]};
        `}
      />
      {!titleEditing && (
        <IconButton
          icon={IconCommonEdit}
          size={14}
          color={ThemingVariables.colors.gray[0]}
          onClick={() => {
            setTitleEditing(true)
            setTimeout(() => {
              contentEditableRef.current?.focus()
            }, 0)
          }}
          className={css`
            margin-left: 4px;
          `}
        />
      )}
      <IconButton
        icon={IconCommonClose}
        color={ThemingVariables.colors.gray[0]}
        onClick={() => {
          sideBarQuestionEditor.close()
        }}
        className={css`
          margin-left: auto;
          cursor: pointer;
        `}
      />
    </div>
  )
}

export const VariableSideBar: ReactFCWithChildren<{ storyId: string; blockId: string }> = ({ storyId, blockId }) => {
  const { t } = useTranslation()

  return (
    <Tabs.Root asChild value="Variable">
      <div
        className={css`
          height: 100%;
          display: flex;
          background-color: #fff;
          flex-direction: column;
        `}
      >
        <Tabs.List
          className={css`
            border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
            overflow-x: auto;
            white-space: nowrap;
            padding-right: 16px;
          `}
        >
          <Tabs.Tabs asChild>
            <Tabs.TabsTrigger value="Variable" asChild>
              <SideBarTabHeader selected>{t<string>(`Variable`)}</SideBarTabHeader>
            </Tabs.TabsTrigger>
          </Tabs.Tabs>
        </Tabs.List>

        <Tabs.Content value="Variable">
          <React.Suspense fallback={<></>}>
            <VariableSettingsSection storyId={storyId} blockId={blockId} key={blockId} />
          </React.Suspense>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  )
}

export const QuestionEditorSideBar: ReactFCWithChildren<{ storyId: string; blockId: string }> = ({
  storyId,
  blockId
}) => {
  const { t } = useTranslation()
  const block = useBlockSuspense<Editor.VisualizationBlock>(blockId)
  const queryBlock = useBlockSuspense(block.content?.queryId || blockId)
  const [sideBarEditorState, setSideBarEditorState] = useSideBarRightState(storyId)

  const changeTab = useCallback(
    (tab: 'Visualization' | 'Modeling' | 'Query') => {
      setSideBarEditorState((value) => {
        if (value) {
          return { ...value, data: { ...value.data, activeTab: tab } }
        }
        return value
      })
    },
    [setSideBarEditorState]
  )

  const tabValue = sideBarEditorState?.data?.activeTab ?? 'Visualization'

  return (
    <Tabs.Root
      value={tabValue}
      onValueChange={(value) => {
        changeTab(value as 'Visualization' | 'Modeling' | 'Query')
      }}
    >
      <div
        className={css`
          height: 100%;
          display: flex;
          background-color: #fff;
          flex-direction: column;
        `}
      >
        <QuestionTitleEditor blockId={queryBlock.id} storyId={storyId} key={blockId} />
        <Tabs.List
          className={css`
            border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
            overflow-x: auto;
            white-space: nowrap;
            padding-right: 16px;
          `}
        >
          {queryBlock.type === Editor.BlockType.SmartQuery ? (
            <Tabs.Trigger asChild value="Query">
              <SideBarTabHeader selected={tabValue === 'Query'}>{t<string>(`Query`)}</SideBarTabHeader>
            </Tabs.Trigger>
          ) : null}
          <Tabs.Trigger asChild value="Visualization">
            <SideBarTabHeader selected={tabValue === 'Visualization'}>{t<string>(`Visualization`)}</SideBarTabHeader>
          </Tabs.Trigger>
          {queryBlock.type !== Editor.BlockType.SmartQuery ? (
            <Tabs.Trigger asChild value="Modeling">
              <SideBarTabHeader selected={tabValue === 'Modeling'}>{t<string>(`Modeling`)}</SideBarTabHeader>
            </Tabs.Trigger>
          ) : null}
        </Tabs.List>
        <PerfectScrollbar
          options={{ suppressScrollX: true }}
          className={css`
            flex: 1;
          `}
        >
          {queryBlock.type === Editor.BlockType.SmartQuery ? (
            <Tabs.Content value="Query">
              <React.Suspense fallback={<></>}>
                <SideBarSmartQuery storyId={storyId} blockId={blockId} />
              </React.Suspense>
            </Tabs.Content>
          ) : null}
          <Tabs.Content value="Visualization">
            <React.Suspense fallback={<></>}>
              <SideBarVisualization storyId={storyId} blockId={blockId} key={blockId} />
            </React.Suspense>
          </Tabs.Content>
          {queryBlock.type !== Editor.BlockType.SmartQuery ? (
            <Tabs.Content value="Modeling">
              <React.Suspense fallback={<></>}>
                <SideBarModeling storyId={storyId} blockId={blockId} />
              </React.Suspense>
            </Tabs.Content>
          ) : null}
        </PerfectScrollbar>
      </div>
    </Tabs.Root>
  )
}

export const SideBarRight: ReactFCWithChildren<{ storyId: string }> = ({ storyId }) => {
  const [sideBarEditorState] = useSideBarRightState(storyId)

  if (sideBarEditorState?.type === 'Variable' && sideBarEditorState.data?.blockId) {
    return <VariableSideBar storyId={storyId} blockId={sideBarEditorState.data.blockId} />
  }

  if (sideBarEditorState?.type === 'Question' && sideBarEditorState.data?.blockId) {
    return <QuestionEditorSideBar storyId={storyId} blockId={sideBarEditorState.data.blockId} />
  }

  return <DefaultSideBar storyId={storyId} />
}
