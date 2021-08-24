import {
  IconCommonDbt,
  IconCommonSql,
  IconCommonBackLink,
  IconCommonMetrics,
  IconCommonQuestion,
  IconCommonLock,
  IconCommonMenu,
  IconCommonMore
} from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useSearchDBTBlocks, useSearchMetrics } from '@app/hooks/api'
import { useStoryResources } from '@app/hooks/useStoryResources'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import { Tab } from '@headlessui/react'
import Tippy from '@tippyjs/react'
import React, { Fragment, useMemo } from 'react'
import ContentLoader from 'react-content-loader'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { Link } from 'react-router-dom'
import { useStoryPathParams } from '../hooks/useStoryPathParams'
import { useGetBlockTitleTextSnapshot } from './editor'
import { useQuestionEditor } from './StoryQuestionsEditor'

const SideBarLoader: React.FC = () => {
  return (
    <ContentLoader viewBox="0 0 210 36" style={{ width: '100%', height: '32px', padding: '0' }}>
      <rect x="0" y="0" rx="0" ry="0" width="210" height="36" />
    </ContentLoader>
  )
}

const StoryDataAssetItem: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const block = useBlockSuspense(blockId)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  // const pushFocusedBlockIdState = usePushFocusedBlockIdState()
  const questionEditor = useQuestionEditor()

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `drag-${block.id}`,
    data: {
      type: DnDItemTypes.Block,
      originalBlockId: block.id,
      blockData: createEmptyBlock<Editor.VisualizationBlock>({
        type: Editor.BlockType.Visualization,
        storyId: storyId,
        parentId: storyId,
        content: {
          dataAssetId: block.id
        }
      })
    } as DndItemDataBlockType
  })

  const openStory = useOpenStory()
  const { t } = useTranslation()

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 6px 16px;
        margin-bottom: 5px;
        :hover {
          background: ${ThemingVariables.colors.primary[5]};
        }
      `}
      {...listeners}
      {...attributes}
      ref={setNodeRef}
      onClick={() => {
        if (block.storyId === storyId) {
          questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
        } else {
          openStory(block.storyId!)
        }
        // pushFocusedBlockIdState(block.id, block.storyId)
      }}
    >
      {block.type === Editor.BlockType.SQL || block.type === Editor.BlockType.SnapshotBlock ? (
        <IconCommonSql
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin-right: 8px;
          `}
        />
      ) : null}
      {block.type === Editor.BlockType.Metric ? (
        <IconCommonMetrics
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin-right: 8px;
          `}
        />
      ) : null}
      {block.type === Editor.BlockType.DBT ? (
        <IconCommonDbt
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin-right: 8px;
          `}
        />
      ) : null}
      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          flex: 1;
          color: ${ThemingVariables.colors.text[0]};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {getBlockTitle(block)}
      </span>
      {block.storyId !== storyId && (
        <Tippy content={t`Click to navigate to the original story`} arrow={false} placement="right">
          <Link to={`/story/${block.storyId}`}>
            <IconCommonBackLink color={ThemingVariables.colors.gray[0]} width="16px" height="16px" />
          </Link>
        </Tippy>
      )}
      {block.type === Editor.BlockType.SnapshotBlock && (
        <Tippy content={t`Frozen data`} arrow={false} placement="right">
          <div>
            <IconCommonLock color={ThemingVariables.colors.gray[0]} width="16px" height="16px" />
          </div>
        </Tippy>
      )}
      {/* <div>
        <IconCommonMore />
      </div> */}
    </div>
  )
}

const DataAssetItem: React.FC<{ block: Editor.BaseBlock; currentStoryId: string }> = ({ block, currentStoryId }) => {
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `drag-${block.id}`,
    data: {
      type: DnDItemTypes.Block,
      originalBlockId: block.id,
      blockData: createEmptyBlock<Editor.VisualizationBlock>({
        type: Editor.BlockType.Visualization,
        storyId: currentStoryId,
        parentId: currentStoryId,
        content: {
          dataAssetId: block.id
        }
      })
    } as DndItemDataBlockType
  })

  const questionEditor = useQuestionEditor()

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 6px 16px;
        margin-bottom: 5px;
        user-select: none;
        :hover {
          background: ${ThemingVariables.colors.primary[5]};
        }
      `}
      {...listeners}
      {...attributes}
      ref={setNodeRef}
      onClick={() => {
        // pushFocusedBlockIdState(block.id, block.storyId)
        questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
      }}
    >
      {block.type === Editor.BlockType.Metric ? (
        <IconCommonMetrics
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin-right: 8px;
          `}
        />
      ) : block.type === Editor.BlockType.DBT ? (
        <IconCommonDbt
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin-right: 8px;
          `}
        />
      ) : (
        <IconCommonQuestion
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin-right: 8px;
          `}
        />
      )}

      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[0]};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {getBlockTitle(block)}
      </span>
    </div>
  )
}

const CurrentStoryQueries: React.FC = () => {
  const storyId = useStoryPathParams()

  return storyId ? (
    <React.Suspense fallback={<></>}>
      <StoryResources storyId={storyId} />{' '}
    </React.Suspense>
  ) : null
}

const StoryResources: React.FC<{ storyId: string }> = ({ storyId }) => {
  const resourceBlocks = useStoryResources(storyId)

  if (!storyId) return null

  return (
    <PerfectScrollbar
      className={css`
        flex: 1;
        overflow-y: auto;
      `}
      options={{ suppressScrollX: true }}
    >
      {resourceBlocks.map((block) => {
        return <StoryDataAssetItem key={block.id} blockId={block.id} storyId={storyId} />
      })}
    </PerfectScrollbar>
  )
}

const AllMetrics: React.FC = () => {
  const metricBlocksQuery = useSearchMetrics('', 1000)
  const dbtBlocksMap = useSearchDBTBlocks('', 1000)
  const storyId = useStoryPathParams()

  const dataAssetBlocks = useMemo(() => {
    const metricsBlocks = Object.values(metricBlocksQuery.data?.blocks ?? {}).filter(
      (block) => block.type === Editor.BlockType.Metric
    )
    const dbtBlocks = Object.values(dbtBlocksMap.data?.blocks ?? {}).filter(
      (block) => block.type === Editor.BlockType.DBT
    )
    return [...metricsBlocks, ...dbtBlocks]
  }, [metricBlocksQuery.data?.blocks, dbtBlocksMap.data?.blocks])

  return (
    <PerfectScrollbar
      className={css`
        flex: 1;
        overflow-y: auto;
      `}
      options={{ suppressScrollX: true }}
    >
      {dataAssetBlocks.map((block) => {
        return (
          <React.Suspense key={block.id} fallback={<SideBarLoader />}>
            <DataAssetItem block={block} currentStoryId={storyId!} />
          </React.Suspense>
        )
      })}
    </PerfectScrollbar>
  )
}

export const SideBarMetricsSection = () => {
  const { t } = useTranslation()
  const TABS = useMemo(
    () => [
      { name: t`Queries`, Component: <CurrentStoryQueries /> },
      {
        name: t`Data Assets`,
        Component: <AllMetrics />
      }
    ],
    [t]
  )
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
            <Tab.Panel
              className={css`
                height: 100%;
              `}
              key={tab.name}
            >
              {tab.Component}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
