import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { Tab } from '@headlessui/react'
import React, { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrentStoryQueries } from './SideBarCurrentStoryQueries'
import { SideBarDataAssets } from './SideBarDataAssets'

export const SideBarMetricsSection: React.FC<{ storyId: string }> = ({ storyId }) => {
  const { t } = useTranslation()

  const TABS = useMemo(() => {
    if (!storyId) return []
    return [
      // { name: t`Current Page`, Component: <CurrentStoryQueries storyId={storyId} /> },
      {
        name: t`Data Assets`,
        Component: <SideBarDataAssets storyId={storyId} />
      }
    ]
  }, [storyId, t])
  return (
    <div
      className={css`
        height: 100%;
        overflow-y: hidden;
        border-right: 1px solid #dedede;
        display: flex;
        flex-direction: column;
      `}
    >
      <Tab.Group>
        <Tab.List
          className={css`
            border-bottom: solid 1px ${ThemingVariables.colors.gray[1]};
          `}
        >
          {TABS.map((tab) => (
            <Tab as={Fragment} key={tab.name}>
              {({ selected }) => (
                <button
                  className={cx(
                    css`
                      font-style: normal;
                      font-weight: 500;
                      font-size: 12px;
                      line-height: 15px;
                      color: ${ThemingVariables.colors.text[1]};
                      background: transparent;
                      border: none;
                      padding: 15px;
                      cursor: pointer;
                    `,
                    selected &&
                      css`
                        color: ${ThemingVariables.colors.text[0]};
                      `
                  )}
                >
                  {tab.name}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels
          className={css`
            flex: 1;
            overflow-y: hidden;
          `}
        >
          {TABS.map((tab) => (
            <React.Suspense fallback={<></>} key={tab.name}>
              <Tab.Panel
                className={css`
                  height: 100%;
                  overflow-y: auto;
                `}
              >
                {tab.Component}
              </Tab.Panel>
            </React.Suspense>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
