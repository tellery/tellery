import { IconCommonDataAsset, IconCommonDbt, IconCommonDrag, IconCommonHandler, IconCommonSql } from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useSearchDBTBlocks, useSearchMetrics } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css } from '@emotion/css'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetBlockTitleTextSnapshot } from './editor'
import { SideBarLoader } from './SideBarLoader'
import { SideBarSection } from './SideBarSection'
import { SideBarSectionHeader } from './SideBarSectionHeader'

export const DataAssetItem: React.FC<{ block: Editor.BaseBlock; currentStoryId: string }> = ({
  block,
  currentStoryId
}) => {
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
          fromDataAssetId: block.id
        }
      })
    } as DndItemDataBlockType
  })

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
        cursor: grab;
        padding: 6px;
        margin: 0 10px 5px 10px;
        user-select: none;
        height: 32px;
        position: relative;
        border-radius: 4px;
        :hover {
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.12);
        }
        :hover {
          > svg {
            opacity: 1;
          }
        }
      `}
      {...listeners}
      {...attributes}
      ref={setNodeRef}
    >
      <IconCommonHandler
        className={css`
          opacity: 0;
          position: absolute;
          left: -10px;
          top: 0;
          bottom: 0;
          margin: auto;
          transition: all 250ms;
        `}
        color={ThemingVariables.colors.gray[0]}
      />
      {/* <IconType
        color={ThemingVariables.colors.gray[0]}
        className={css`
          flex-shrink: 0;
          margin-right: 8px;
        `}
      /> */}

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
      {/* <SideBarSection>
        <SideBarSectionHeader>{t`All Metrics`}</SideBarSectionHeader>
      </SideBarSection> */}
      <div
        className={css`
          padding-top: 10px;
        `}
      ></div>
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
export const SideBarDataAssets: React.FC<{ storyId: string }> = ({ storyId }) => {
  return (
    <div
      className={css`
        flex: 1;
        overflow-y: auto;
      `}
    >
      <AllMetricsSection storyId={storyId} />
      {/* <DBTSection storyId={storyId} /> */}
    </div>
  )
}
