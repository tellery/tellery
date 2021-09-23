import { IconCommonClose, IconCommonDataAsset, IconCommonDbt, IconCommonEdit, IconCommonLock } from '@app/assets/icons'
import { useBlockSuspense } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, TabList, TabPanel, useTabState } from 'reakit/Tab'
import { useSideBarQuestionEditor, useSideBarQuestionEditorState } from '../hooks/useSideBarQuestionEditor'
import { ContentEditablePureText, EditableSimpleRef } from './editor/BlockBase/ContentEditablePureText'
import IconButton from './kit/IconButton'
import { SideBarDataAssets } from './SideBarDataAssets'
import SideBarVisualization from './SideBarVisualization'
import SideBarModeling from './SideBarModeling'
import { SideBarTabHeader } from './v11n/components/Tab'
import SideBarSmartQuery from './SideBarSmartQuery'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useRightSideBarConfig } from '@app/hooks/useRightSideBarConfig'

export const DefaultSideBar: React.FC<{ storyId: string }> = ({ storyId }) => {
  const tab = useTabState()
  const { t } = useTranslation()

  return (
    <div
      className={css`
        height: 100%;
        border-left: 1px solid #dedede;
        display: flex;
        background-color: #fff;
        flex-direction: column;
      `}
    >
      <TabList
        {...tab}
        className={css`
          border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
          overflow-x: auto;
          white-space: nowrap;
          padding-right: 16px;
        `}
      >
        <Tab as={SideBarTabHeader} {...tab} id="Data Assets" selected={tab.selectedId === 'Data Assets'}>
          {t`Data Assets`}
        </Tab>
      </TabList>
      <PerfectScrollbar
        options={{ suppressScrollX: true }}
        className={css`
          flex: 1;
        `}
      >
        <TabPanel {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarDataAssets storyId={storyId} />
          </React.Suspense>
        </TabPanel>
      </PerfectScrollbar>
    </div>
  )
}

export const QuestionTitleEditor: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
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
        {queryBlock.type === Editor.BlockType.QueryBuilder ? (
          <IconCommonDataAsset color={ThemingVariables.colors.text[0]} />
        ) : null}
        {queryBlock.type === Editor.BlockType.SnapshotBlock ? (
          <IconCommonLock color={ThemingVariables.colors.text[0]} />
        ) : null}
        {queryBlock.type === Editor.BlockType.DBT ? <IconCommonDbt color={ThemingVariables.colors.text[0]} /> : null}
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
          onClick={(e) => {
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
        onClick={(e) => {
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

export const QuestionEditorSideBar: React.FC<{ storyId: string; blockId: string }> = ({ storyId, blockId }) => {
  const tab = useTabState()
  const { t } = useTranslation()
  const block = useBlockSuspense<Editor.VisualizationBlock>(blockId)
  const queryBlock = useBlockSuspense(block.content?.queryId || blockId)
  const [sideBarEditorState, setSideBarEditorState] = useSideBarQuestionEditorState(storyId)

  useEffect(() => {
    if (sideBarEditorState?.activeTab) {
      tab.setSelectedId(sideBarEditorState?.activeTab)
    }
  }, [sideBarEditorState, tab])

  const changeTab = useCallback(
    (tab: 'Visualization' | 'Modeling' | 'Data') => {
      setSideBarEditorState((value) => {
        if (value) {
          return { ...value, activeTab: tab }
        }
        return value
      })
    },
    [setSideBarEditorState]
  )

  return (
    <div
      className={css`
        height: 100%;
        border-left: 1px solid #dedede;
        display: flex;
        background-color: #fff;
        flex-direction: column;
      `}
    >
      <QuestionTitleEditor blockId={queryBlock.id} storyId={storyId} key={blockId} />
      <TabList
        {...tab}
        className={css`
          border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
          overflow-x: auto;
          white-space: nowrap;
          padding-right: 16px;
        `}
      >
        <Tab
          as={SideBarTabHeader}
          {...tab}
          id="Data"
          selected={tab.selectedId === 'Data'}
          disabled={queryBlock.type !== Editor.BlockType.SmartQuery}
          focusable={queryBlock.type === Editor.BlockType.SmartQuery}
          onClick={() => {
            changeTab('Data')
          }}
        >
          {t`Data`}
        </Tab>
        <Tab
          as={SideBarTabHeader}
          {...tab}
          id="Visualization"
          selected={tab.selectedId === 'Visualization'}
          onClick={() => {
            changeTab('Visualization')
          }}
        >
          {t`Visualization`}
        </Tab>
        <Tab
          as={SideBarTabHeader}
          {...tab}
          id="Modeling"
          selected={tab.selectedId === 'Modeling'}
          disabled={queryBlock.type === Editor.BlockType.SmartQuery}
          focusable={queryBlock.type !== Editor.BlockType.SmartQuery}
          onClick={() => {
            changeTab('Modeling')
          }}
        >
          {t`Modeling`}
        </Tab>
      </TabList>
      <PerfectScrollbar
        options={{ suppressScrollX: true }}
        className={css`
          flex: 1;
        `}
      >
        <TabPanel {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarSmartQuery storyId={storyId} blockId={blockId} />
          </React.Suspense>
        </TabPanel>
        <TabPanel {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarVisualization storyId={storyId} blockId={blockId} />
          </React.Suspense>
        </TabPanel>
        <TabPanel {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarModeling storyId={storyId} blockId={blockId} />
          </React.Suspense>
        </TabPanel>
      </PerfectScrollbar>
    </div>
  )
}

export const SideBarRight: React.FC<{ storyId: string }> = ({ storyId }) => {
  const [sideBarEditorState] = useSideBarQuestionEditorState(storyId)
  // const tab = useTabState()
  // const { setSelectedId } = tab

  // useEffect(() => {
  //   setSelectedId(sideBarEditorState?.activeTab || 'Data Assets')
  // }, [setSelectedId, sideBarEditorState])

  if (sideBarEditorState?.blockId) {
    return <QuestionEditorSideBar storyId={storyId} blockId={sideBarEditorState.blockId} />
  }

  return <DefaultSideBar storyId={storyId} />
}
