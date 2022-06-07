import { css } from '@emotion/css'
import * as Tabs from '@radix-ui/react-tabs'
import React, { ReactNode, useEffect, useState } from 'react'
import { SideBarTabHeader } from './Tab'
import { ThemingVariables } from '@app/styles'

export function ConfigTab(props: { tabs: string[]; tab?: string; children: ReactNode[] | ReactNode }) {
  const [activeTab, setActiveTab] = useState<string | undefined>(props.tab ?? props.tabs[0])
  useEffect(() => {
    if (props.tab) {
      setActiveTab(props.tab)
    }
  }, [props.tab, props.tabs])

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className={css`
        height: 100%;
        overflow-y: hidden;
        display: flex;
        flex-direction: column;
      `}
    >
      <Tabs.List
        className={css`
          overflow-x: auto;
          white-space: nowrap;
          padding-right: 16px;
          border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
        `}
      >
        {props.tabs.map((tab) => (
          <Tabs.Trigger key={tab} asChild value={tab}>
            <SideBarTabHeader selected={tab === activeTab}>{tab}</SideBarTabHeader>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {props.tabs.map((tab, index) => (
        <Tabs.Content key={tab} value={tab} asChild>
          {Array.isArray(props.children) ? props.children[index] : props.children}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
