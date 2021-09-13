import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, TabList, TabPanel, useTabState } from 'reakit/Tab'
import { useSideBarQuestionEditorState } from '../hooks/useSideBarQuestionEditor'
import { SideBarDataAssets } from './SideBarDataAssets'
import SideBarVisualizationConfig from './SideBarVisualizationConfig'
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
  const [sideBarEditorState] = useSideBarQuestionEditorState(storyId)
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
        <Tab as={SideBarTabHeader} {...tab} id="Visualization" selected={tab.selectedId === 'Visualization'}>
          {t`Visualization`}
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
            {sideBarEditorState?.blockId && <SideBarVisualizationConfig storyId={storyId} blockId={blockId} />}
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
