import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { Tab } from '@headlessui/react'
import React, { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SideBarDataAssets } from './SideBarDataAssets'
import { useSideBarQuestionEditorState } from '../hooks/useSideBarQuestionEditor'
import styled from '@emotion/styled'
import { useBlock } from '@app/hooks/api'
import { isVisualizationBlock } from './editor/Blocks/utils'

const SideBarDownStream: React.FC<{ storyId: string; blockId: string }> = ({ storyId, blockId }) => {
  return (
    <React.Suspense fallback={<></>}>
      <StyledTabPanel>
        <SideBarDownStream storyId={storyId} blockId={blockId} />
      </StyledTabPanel>
    </React.Suspense>
  )
}

const StyledTabPanel = styled(Tab.Panel)`
  height: 100%;
  overflow-y: auto;
`

const SideBarTabHeader = styled.button<{ selected: boolean }>`
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 15px;
  color: ${ThemingVariables.colors.text[1]};
  background: transparent;
  border: none;
  padding: 15px;
  cursor: pointer;
  color: ${(props) => (props.selected ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[1])};
`

export const SideBarRight: React.FC<{ storyId: string }> = ({ storyId }) => {
  const { t } = useTranslation()
  const [sideBarEditorState] = useSideBarQuestionEditorState(storyId)
  const currentBlockId = sideBarEditorState?.blockId ?? storyId
  const currentBlock = useBlock(currentBlockId)

  const showVisulizationTab = useMemo(() => {
    return currentBlock.data && isVisualizationBlock(currentBlock.data.type)
  }, [currentBlock.data])

  const showModelingTab = useMemo(() => {
    return currentBlock.data && isVisualizationBlock(currentBlock.data.type)
  }, [currentBlock.data])

  const showDownStreamsTab = useMemo(() => {
    return currentBlock.data && isVisualizationBlock(currentBlock.data.type)
  }, [currentBlock.data])

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
      <Tab.Group>
        <Tab.List
          className={css`
            border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
            overflow-x: auto;
            white-space: nowrap;
          `}
        >
          {showVisulizationTab && (
            <Tab as={Fragment}>
              {({ selected }) => <SideBarTabHeader selected={selected}>{t`Visulization`}</SideBarTabHeader>}
            </Tab>
          )}
          {showModelingTab && (
            <Tab as={Fragment}>
              {({ selected }) => <SideBarTabHeader selected={selected}>{t`Modeling`}</SideBarTabHeader>}
            </Tab>
          )}
          {showDownStreamsTab && (
            <Tab as={Fragment}>
              {({ selected }) => <SideBarTabHeader selected={selected}>{t`Downstream`}</SideBarTabHeader>}
            </Tab>
          )}
          <Tab as={Fragment}>
            {({ selected }) => <SideBarTabHeader selected={selected}>{t`Data Assets`}</SideBarTabHeader>}
          </Tab>
        </Tab.List>
        <Tab.Panels
          className={css`
            flex: 1;
            overflow-y: hidden;
          `}
        >
          {showVisulizationTab && (
            <StyledTabPanel>
              <React.Suspense fallback={<></>}>
                {sideBarEditorState?.blockId && <SideBarDownStream storyId={storyId} blockId={currentBlockId} />}
              </React.Suspense>
            </StyledTabPanel>
          )}

          {showModelingTab && (
            <StyledTabPanel>
              <React.Suspense fallback={<></>}>
                {sideBarEditorState?.blockId && <SideBarDownStream storyId={storyId} blockId={currentBlockId} />}
              </React.Suspense>
            </StyledTabPanel>
          )}

          {showDownStreamsTab && (
            <StyledTabPanel>
              <React.Suspense fallback={<></>}>
                {sideBarEditorState?.blockId && <SideBarDownStream storyId={storyId} blockId={currentBlockId} />}
              </React.Suspense>
            </StyledTabPanel>
          )}

          <StyledTabPanel>
            <React.Suspense fallback={<></>}>
              <SideBarDataAssets storyId={storyId} />
            </React.Suspense>
          </StyledTabPanel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
