import { IconCommonMetrics, IconCommonQuestion } from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBlockSuspense, useSearchDBTBlocks, useSearchMetrics } from '@app/hooks/api'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import { Tab } from '@headlessui/react'
import React, { Fragment, useMemo } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useStoryPathParams } from '../hooks/useStoryPathParams'
import { useGetBlockTitleTextSnapshot } from './editor'
import { isQuestionLikeBlock } from './editor/Blocks/utils'
import { getFilteredOrderdSubsetOfBlocks } from './editor/utils'
import { useQuestionEditor } from './StoryQuestionsEditor'
import ContentLoader from 'react-content-loader'

const SideBarLoader: React.FC = () => {
  return (
    <ContentLoader viewBox="0 0 210 36" style={{ width: '100%', height: '32px', padding: '0' }}>
      <rect x="0" y="0" rx="0" ry="0" width="210" height="36" />
    </ContentLoader>
  )
}

const TocQuestionItem: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const block = useBlockSuspense(blockId)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const pushFocusedBlockIdState = usePushFocusedBlockIdState()

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
      onClick={() => {
        pushFocusedBlockIdState(block.id, block.storyId)
      }}
    >
      {block.type === Editor.BlockType.Question || block.type === Editor.BlockType.QuestionSnapshot ? (
        <IconCommonQuestion
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

const DataAssetItem: React.FC<{ block: Editor.BaseBlock; currentStoryId: string }> = ({ block, currentStoryId }) => {
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `drag-${block.id}`,
    data: {
      type: DnDItemTypes.Block,
      originalBlockId: block.id,
      blockData: createEmptyBlock<Editor.QuestionBlock>({
        type: Editor.BlockType.Question,
        storyId: currentStoryId,
        parentId: currentStoryId,
        content: {
          title: block.content?.title,
          sql: `select * from {{${block.id}}}`,
          visualization: (block.content as any)?.visualization,
          snapshotId: (block.content as any)?.snapshotId
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
      ) : null}

      {block.type !== Editor.BlockType.Metric && (
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

const CurrentStoryQuestions: React.FC = () => {
  const storyId = useStoryPathParams()

  return storyId ? <StoryQuestions storyId={storyId} /> : null
}

const StoryQuestions: React.FC<{ storyId: string }> = ({ storyId }) => {
  const storyBlocksMap = useStoryBlocksMap(storyId)
  const questionLikeBlocks = useMemo(() => {
    if (!storyBlocksMap) return []
    return getFilteredOrderdSubsetOfBlocks(storyBlocksMap, storyId, (block) => isQuestionLikeBlock(block.type))
  }, [storyBlocksMap, storyId])

  if (!storyId) return null

  return (
    <PerfectScrollbar
      className={css`
        flex: 1;
        overflow-y: auto;
      `}
      options={{ suppressScrollX: true }}
    >
      <div>
        {questionLikeBlocks.map((block) => {
          return <TocQuestionItem key={block.id} blockId={block.id} storyId={storyId} />
        })}
      </div>
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
      <div>
        {dataAssetBlocks.map((block) => {
          return (
            <React.Suspense key={block.id} fallback={<SideBarLoader />}>
              <DataAssetItem block={block} currentStoryId={storyId!} />
            </React.Suspense>
          )
        })}
      </div>
    </PerfectScrollbar>
  )
}

const TABS = [
  { name: 'Current Page', Component: <CurrentStoryQuestions /> },
  {
    name: 'All Metrics',
    Component: <AllMetrics />
  }
]

export const SideBarMetricsSection = () => {
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
