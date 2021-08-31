import {
  IconCommonAdd,
  IconCommonBackLink,
  IconCommonDbt,
  IconCommonLock,
  IconCommonDataAsset,
  IconCommonSql
} from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBindHovering } from '@app/hooks'
import { useBlockSuspense, useFetchStoryChunk, useSearchDBTBlocks, useSearchMetrics } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useStoryResources } from '@app/hooks/useStoryResources'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { ThemingVariables } from '@app/styles'
import { Editor, Story, Thought } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import styled from '@emotion/styled'
import { Tab } from '@headlessui/react'
import Tippy from '@tippyjs/react'
import { motion } from 'framer-motion'
import React, { Fragment, memo, ReactNode, useCallback, useMemo } from 'react'
import ContentLoader from 'react-content-loader'
import { useTranslation } from 'react-i18next'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { ReactEventHandlers } from 'react-use-gesture/dist/types'
import { useGetBlockTitleTextSnapshot } from './editor'
import IconButton from './kit/IconButton'
import { LazyTippy } from './LazyTippy'
import { SideBarInspectQueryBlockPopover } from './SideBarInspectQueryBlockPopover'
import { SideBarQueryItemDropdownMenu } from './SideBarQueryItemDropdownMenu'

const SideBarLoader: React.FC = () => {
  return (
    <ContentLoader viewBox="0 0 210 36" style={{ width: '100%', height: '32px', padding: '0' }}>
      <rect x="0" y="0" rx="0" ry="0" width="210" height="36" />
    </ContentLoader>
  )
}

const _StoryDataAssetItemContentDraggable: React.FC<{
  storyId: string
  blockId: string
  hoveringHandlers: (...args: any[]) => ReactEventHandlers
  children: ReactNode
}> = ({ hoveringHandlers, children, storyId, blockId }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `drag-${blockId}`,
    data: {
      type: DnDItemTypes.Block,
      originalBlockId: blockId,
      blockData: createEmptyBlock<Editor.VisualizationBlock>({
        type: Editor.BlockType.Visualization,
        storyId: storyId,
        parentId: storyId,
        content: {
          dataAssetId: blockId
        }
      })
    } as DndItemDataBlockType
  })

  return (
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
      {...hoveringHandlers()}
      ref={setNodeRef}
    >
      {children}
    </div>
  )
}

const StoryDataAssetItemContentDraggable = memo(_StoryDataAssetItemContentDraggable)

const StoryDataAssetItemContent: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const block = useBlockSuspense(blockId)
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const { t } = useTranslation()
  const IconType = useMemo(() => {
    if (block.storyId !== storyId) {
      return IconCommonBackLink
    }
    if (block.type === Editor.BlockType.SQL || block.type === Editor.BlockType.SnapshotBlock) {
      return IconCommonSql
    } else if (block.type === Editor.BlockType.QueryBuilder) {
      return IconCommonDataAsset
    } else if (block.type === Editor.BlockType.DBT) {
      return IconCommonDbt
    }
    return IconCommonSql
  }, [block.storyId, block.type, storyId])

  const [hoveringHandlers, isHovering] = useBindHovering()

  return (
    <StoryDataAssetItemContentDraggable hoveringHandlers={hoveringHandlers} storyId={storyId} blockId={blockId}>
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
        <SideBarQueryItemDropdownMenu block={block} storyId={storyId} show={isHovering} />
      </div>
    </StoryDataAssetItemContentDraggable>
  )
}

const StoryDataAssetItem: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  return <StoryDataAssetItemContent blockId={blockId} storyId={storyId} />
}

const StoryDataAssetItemWithInspectPopover: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const tippyAnimation = useTippyMenuAnimation('fade')

  return (
    <LazyTippy
      render={(attrs) => (
        <motion.div animate={tippyAnimation.controls} {...attrs} transition={{ duration: 0.15 }}>
          <SideBarInspectQueryBlockPopover blockId={blockId}></SideBarInspectQueryBlockPopover>
        </motion.div>
      )}
      delay={500}
      hideOnClick={true}
      animation={true}
      onMount={tippyAnimation.onMount}
      onHide={(instance) => {
        tippyAnimation.onHide(instance)
      }}
      appendTo={document.body}
      interactive
      placement="right-end"
      zIndex={1000}
      // disabled
    >
      <span>
        <StoryDataAssetItemContent blockId={blockId} storyId={storyId} />
      </span>
    </LazyTippy>
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

  const questionEditor = useQuestionEditor(currentStoryId)

  const IconType = useMemo(() => {
    if (block.type === Editor.BlockType.SQL || block.type === Editor.BlockType.SnapshotBlock) {
      return IconCommonSql
    } else if (block.type === Editor.BlockType.QueryBuilder) {
      return IconCommonDataAsset
    } else if (block.type === Editor.BlockType.DBT) {
      return IconCommonDbt
    }
    return IconCommonSql
  }, [block.type])

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
      <IconType
        color={ThemingVariables.colors.gray[0]}
        className={css`
          flex-shrink: 0;
          margin-right: 8px;
        `}
      />

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

const CurrentStoryQueries: React.FC<{ storyId: string }> = ({ storyId }) => {
  useFetchStoryChunk<Story | Thought>(storyId)
  const { t } = useTranslation()
  const blockTranscations = useBlockTranscations()
  const questionEditor = useQuestionEditor(storyId)

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
      <SideBarSection>
        <SideBarSectionHeader>{t`Queries`}</SideBarSectionHeader>
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
      </SideBarSection>
      <StoryResources storyId={storyId} />{' '}
    </React.Suspense>
  ) : null
}

const SideBarSection = styled.div`
  padding: 12px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SideBarSectionHeader = styled.div`
  padding: 0 8px;
  font-weight: 500;
  font-size: 12px;
  line-height: 15px;
  color: ${ThemingVariables.colors.text[0]};
`

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

const AllMetricsSection: React.FC<{ storyId: string }> = ({ storyId }) => {
  const metricBlocksQuery = useSearchMetrics('', 1000)

  const dataAssetBlocks = useMemo(() => {
    const metricsBlocks = Object.values(metricBlocksQuery.data?.blocks ?? {}).filter(
      (block) => block.type === Editor.BlockType.QueryBuilder
    )
    return metricsBlocks
  }, [metricBlocksQuery.data?.blocks])

  const { t } = useTranslation()

  return (
    <>
      <SideBarSection>
        <SideBarSectionHeader>{t`All Metrics`}</SideBarSectionHeader>
      </SideBarSection>
      {dataAssetBlocks.map((block) => {
        return (
          <React.Suspense key={block.id} fallback={<SideBarLoader />}>
            <DataAssetItem block={block} currentStoryId={storyId!} />
          </React.Suspense>
        )
      })}
    </>
  )
}

const DBTSection: React.FC<{ storyId: string }> = ({ storyId }) => {
  const dbtBlocksMap = useSearchDBTBlocks('', 1000)

  const dataAssetBlocks = useMemo(() => {
    const dbtBlocks = Object.values(dbtBlocksMap.data?.blocks ?? {}).filter(
      (block) => block.type === Editor.BlockType.DBT
    )
    return dbtBlocks
  }, [dbtBlocksMap.data?.blocks])

  const { t } = useTranslation()
  if (dataAssetBlocks.length === 0) return null
  return (
    <>
      <SideBarSection>
        <SideBarSectionHeader>{t`DBT`}</SideBarSectionHeader>
      </SideBarSection>
      {dataAssetBlocks.map((block) => {
        return (
          <React.Suspense key={block.id} fallback={<SideBarLoader />}>
            <DataAssetItem block={block} currentStoryId={storyId!} />
          </React.Suspense>
        )
      })}
    </>
  )
}

const DataAssets: React.FC<{ storyId: string }> = ({ storyId }) => {
  return (
    <PerfectScrollbar
      className={css`
        flex: 1;
        overflow-y: auto;
      `}
      options={{ suppressScrollX: true }}
    >
      <AllMetricsSection storyId={storyId} />
      <DBTSection storyId={storyId} />
    </PerfectScrollbar>
  )
}

export const SideBarMetricsSection: React.FC<{ storyId: string }> = ({ storyId }) => {
  const { t } = useTranslation()

  const TABS = useMemo(() => {
    if (!storyId) return []
    return [
      { name: t`Current Page`, Component: <CurrentStoryQueries storyId={storyId} /> },
      {
        name: t`Data Assets`,
        Component: <DataAssets storyId={storyId} />
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
