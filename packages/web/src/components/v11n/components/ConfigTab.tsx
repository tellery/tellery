import { css } from '@emotion/css'
import { Tab, TabList, TabPanel, useTabState } from 'reakit/Tab'
import React, { ReactNode, useEffect } from 'react'
import { SideBarTabHeader, StyledTabPanel } from './Tab'

export function ConfigTab(props: { tabs: string[]; tab?: string; children: ReactNode[] | ReactNode }) {
  const tabState = useTabState()
  const { setSelectedId } = tabState
  useEffect(() => {
    if (props.tab) {
      setSelectedId(props.tab)
    }
  }, [props.tab, props.tabs, setSelectedId])

  return (
    <div
      className={css`
        height: 100%;
        overflow-y: hidden;
        display: flex;
        flex-direction: column;
      `}
    >
      <TabList
        {...tabState}
        className={css`
          overflow-x: auto;
          white-space: nowrap;
          padding-right: 16px;
        `}
      >
        {props.tabs.map((tab) => (
          <Tab key={tab} as={SideBarTabHeader} {...tabState} id={tab} selected={tabState.selectedId === tab}>
            {tab}
          </Tab>
        ))}
      </TabList>
      <div
        className={css`
          flex: 1;
          overflow-y: hidden;
        `}
      >
        {props.tabs.map((tab, index) => (
          <TabPanel key={tab} as={StyledTabPanel} {...tabState}>
            {Array.isArray(props.children) ? props.children[index] : props.children}
          </TabPanel>
        ))}
      </div>
    </div>
  )
}
