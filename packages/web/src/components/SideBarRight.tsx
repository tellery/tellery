import { useBlockSuspense } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, TabList, TabPanel, useTabState } from 'reakit/Tab'
import { useSideBarQuestionEditorState } from '../hooks/useSideBarQuestionEditor'
import { SideBarDataAssets } from './SideBarDataAssets'
import SideBarVisualization from './SideBarVisualization'
import SideBarModeling from './SideBarModeling'
import { SideBarTabHeader, StyledTabPanel } from './v11n/components/Tab'

export const DefaultSideBar: React.FC<{ storyId: string }> = ({ storyId }) => {
  const tab = useTabState()
  const { t } = useTranslation()

  return (
    <div
      className={css`
        height: 100%;
        overflow-y: hidden;
        border-left: 1px solid #dedede;
        display: flex;
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
      <div
        className={css`
          flex: 1;
          overflow-y: hidden;
        `}
      >
        <TabPanel as={StyledTabPanel} {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarDataAssets storyId={storyId} />
          </React.Suspense>
        </TabPanel>
      </div>
    </div>
  )
}

export const QuestionEditorSideBar: React.FC<{ storyId: string; blockId: string }> = ({ storyId, blockId }) => {
  const tab = useTabState()
  const { t } = useTranslation()
  const block = useBlockSuspense<Editor.VisualizationBlock>(blockId)
  const queryBlock = useBlockSuspense(block.content?.queryId || blockId)

  return (
    <div
      className={css`
        height: 100%;
        overflow-y: hidden;
        border-left: 1px solid #dedede;
        display: flex;
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
        <Tab as={SideBarTabHeader} {...tab} id="Visualization" selected={tab.selectedId === 'Visualization'}>
          {t`Visualization`}
        </Tab>
        <Tab
          as={SideBarTabHeader}
          {...tab}
          id="Modeling"
          selected={tab.selectedId === 'Modeling'}
          disabled={queryBlock.type === Editor.BlockType.SmartQuery}
        >
          {t`Modeling`}
        </Tab>
      </TabList>
      <div
        className={css`
          flex: 1;
          overflow-y: hidden;
        `}
      >
        <TabPanel as={StyledTabPanel} {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarVisualization storyId={storyId} blockId={blockId} />
          </React.Suspense>
        </TabPanel>
        <TabPanel as={StyledTabPanel} {...tab}>
          <React.Suspense fallback={<></>}>
            <SideBarModeling storyId={storyId} blockId={blockId} />
          </React.Suspense>
        </TabPanel>
      </div>
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
