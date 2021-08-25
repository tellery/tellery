import {
  IconCommonAdd,
  IconCommonBackLink,
  IconCommonDbt,
  IconCommonLock,
  IconCommonMetrics,
  IconCommonQuestion,
  IconCommonSql,
  IconMenuImport
} from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBlockSuspense, useSearchDBTBlocks, useSearchMetrics } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useStoryResources } from '@app/hooks/useStoryResources'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import { Tab } from '@headlessui/react'
import Tippy from '@tippyjs/react'
import React, { Fragment, useCallback, useMemo } from 'react'
import ContentLoader from 'react-content-loader'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useStoryPathParams } from '../hooks/useStoryPathParams'
import { BlockTitle, useGetBlockTitleTextSnapshot } from './editor'
import IconButton from './kit/IconButton'
import { MenuWrapper } from './MenuWrapper'
import { SideBarQueryItemDropdownMenu } from './SideBarQueryItemDropdownMenu'
import { useQuestionEditor } from './StoryQuestionsEditor'

const SideBarLoader: React.FC = () => {
  return (
    <ContentLoader viewBox="0 0 210 36" style={{ width: '100%', height: '32px', padding: '0' }}>
      <rect x="0" y="0" rx="0" ry="0" width="210" height="36" />
    </ContentLoader>
  )
}

const InspectQueryBlockPopover: React.FC<{ block: Editor.DataAssetBlock }> = ({ block }) => {
  return (
    <MenuWrapper>
      <BlockTitle block={block} />
    </MenuWrapper>
  )
}

const StoryDataAssetItem: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const block = useBlockSuspense(blockId)
  const getBlockTitle = useGetBlockTitleTextSnapshot()

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

  const { t } = useTranslation()
  const tippyAnimation = useTippyMenuAnimation('fade')
  const IconType = useMemo(() => {
    if (block.storyId !== storyId) {
      return IconCommonBackLink
    }
    if (block.type === Editor.BlockType.SQL || block.type === Editor.BlockType.SnapshotBlock) {
      return IconCommonSql
    } else if (block.type === Editor.BlockType.Metric) {
      return IconCommonMetrics
    } else if (block.type === Editor.BlockType.DBT) {
      return IconCommonDbt
    }
    return IconCommonSql
  }, [block.storyId, block.type, storyId])

  return (
    <Tippy
      // render={(attrs) => (
      //   <motion.div animate={tippyAnimation.controls} {...attrs} transition={{ duration: 0.15 }}>
      //     <InspectQueryBlockPopover block={block}></InspectQueryBlockPopover>
      //   </motion.div>
      // )}
      hideOnClick={true}
      animation={true}
      onMount={tippyAnimation.onMount}
      onHide={tippyAnimation.onHide}
      appendTo={document.body}
      placement="right-end"
      disabled
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 6px 8px;
          margin-bottom: 5px;
          :hover {
            background: ${ThemingVariables.colors.primary[5]};
          }
        `}
        {...listeners}
        {...attributes}
        ref={setNodeRef}
      >
        <IconType
          color={ThemingVariables.colors.gray[0]}
          className={css`
            flex-shrink: 0;
            margin: 0 8px;
          `}
        />

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
        <div
          className={css`
            > * + * {
              margin-left: 16px;
            }
            display: flex;
            align-items: center;
          `}
        >
          {block.type === Editor.BlockType.SnapshotBlock && (
            <Tippy content={t`Frozen data`} arrow={false} placement="right">
              <div>
                <IconCommonLock color={ThemingVariables.colors.text[0]} width="16px" height="16px" />
              </div>
            </Tippy>
          )}
          {/* <SideBarQueryItemDropdownMenu block={block} storyId={storyId} /> */}
        </div>
      </div>
    </Tippy>
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
  const { t } = useTranslation()
  const blockTranscations = useBlockTranscations()
  const questionEditor = useQuestionEditor()

  const createNewQuery = useCallback(async () => {
    if (!storyId) return
    const newBlock = createEmptyBlock<Editor.SQLBlock>({
      type: Editor.BlockType.SQL,
      storyId,
      parentId: storyId,
      content: { sql: '' }
    })
    const newBlocks = [newBlock]
    await blockTranscations.insertBlocks(storyId, {
      blocksFragment: {
        children: newBlocks.map((block) => block.id),
        data: newBlocks.reduce((a, c) => {
          a[c.id] = c
          return a
        }, {} as Record<string, Editor.BaseBlock>)
      },
      targetBlockId: storyId,
      direction: 'child',
      path: 'resources'
    })
    questionEditor.open({ mode: 'SQL', blockId: newBlock.id, storyId: newBlock.storyId! })
  }, [blockTranscations, questionEditor, storyId])

  return storyId ? (
    <React.Suspense fallback={<></>}>
      <div
        className={css`
          padding: 12px 8px;
          font-weight: 500;
          font-size: 12px;
          line-height: 15px;
          color: ${ThemingVariables.colors.text[0]};
          display: flex;
          align-items: center;
          justify-content: space-between;
        `}
      >
        <div
          className={css`
            padding: 0 8px;
          `}
        >{t`Queries`}</div>
        <div
          className={css`
            display: flex;
            align-items: center;
            > * + * {
              margin-left: 16px;
            }
            > {
              padding: 8px 0;
            }
          `}
        >
          {/* <IconButton icon={IconMenuImport} hoverContent={t`Import a query`} /> */}
          <IconButton icon={IconCommonAdd} hoverContent={t`Create a new query`} onClick={createNewQuery} />
        </div>
      </div>
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
      { name: t`Current Page`, Component: <CurrentStoryQueries /> },
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
