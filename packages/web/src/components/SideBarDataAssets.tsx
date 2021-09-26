import { IconCommonBackLink, IconCommonHandler, IconCommonMore } from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useOpenStory } from '@app/hooks'
import { useSearchDBTBlocks, useSearchMetrics } from '@app/hooks/api'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { AnimationControls, motion, MotionStyle } from 'framer-motion'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetBlockTitleTextSnapshot } from './editor'
import IconButton from './kit/IconButton'
import { MenuItem } from './MenuItem'
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

  return (
    <div
      className={css`
        display: flex;
        :hover {
          .button {
            opacity: 1;
          }
        }
      `}
    >
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
          flex: 1;
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
      <DataAssestMenu storyId={currentStoryId} block={block} />
    </div>
  )
}

const DataAssestMenu: React.FC<{ storyId: string; block: Editor.DataAssetBlock }> = ({ storyId, block }) => {
  const animation = useTippyMenuAnimation('scale')
  const [visible, setVisible] = useState(false)
  const show = () => setVisible(true)
  const hide = () => setVisible(false)

  return (
    <Tippy
      render={(attrs) => <DataAssestMenuContent block={block} animate={animation.controls} close={hide} {...attrs} />}
      theme="tellery"
      animation={true}
      visible={visible}
      onClickOutside={hide}
      onMount={animation.onMount}
      onHide={(instance) => {
        animation.onHide(instance)
      }}
      duration={150}
      arrow={false}
      interactive
      placement="bottom"
    >
      <IconButton
        icon={IconCommonMore}
        onClick={show}
        className={cx(
          'button',
          css`
            margin-right: 15px;
            opacity: 0;
            transition: opacity 150ms;
          `
        )}
      />
    </Tippy>
  )
}

export const DataAssestMenuContent: React.FC<{
  style?: MotionStyle
  animate?: AnimationControls
  block: Editor.DataAssetBlock
  close: Function
}> = (props) => {
  const openStory = useOpenStory()
  return (
    <motion.div
      style={props.style}
      animate={props.animate}
      transition={{ duration: 0.15 }}
      className={cx(
        css`
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          padding: 4px;
          width: 130px;
          display: block;
          cursor: pointer;
        `
      )}
    >
      <MenuItem
        icon={<IconCommonBackLink color={ThemingVariables.colors.text[0]} />}
        title="Open in story"
        onClick={() => {
          props.close()
          openStory(props.block.storyId!, { blockId: props.block.id })
        }}
      />
    </motion.div>
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
