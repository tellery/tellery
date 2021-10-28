import {
  IconCommonArrowDropDown,
  IconCommonBackLink,
  IconCommonMore,
  IconCommonSearch,
  IconCommonSmartQuery
} from '@app/assets/icons'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useOpenStory } from '@app/hooks'
import { useBlockSuspense, useQuerySnapshot, useSearchMetrics } from '@app/hooks/api'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import { AnimationControls, motion, MotionStyle } from 'framer-motion'
import React, { useMemo, useState } from 'react'
import ContentLoader from 'react-content-loader'
import { CircularLoading } from './CircularLoading'
import { useGetBlockTitleTextSnapshot } from './editor'
import IconButton from './kit/IconButton'
import { MenuItem } from './MenuItem'

export const DataAssestCardLoader: React.FC = () => {
  return (
    <ContentLoader
      viewBox="0 0 284 110"
      style={{ padding: '0' }}
      className={css`
        margin: 0 10px 8px 10px;
        box-sizing: border-box;
      `}
    >
      <rect x="0" y="0" rx="0" ry="0" width="284" height="110" />
    </ContentLoader>
  )
}

const DataAssestCardSection = styled.div`
  border-top: solid 1px ${ThemingVariables.colors.gray[1]};
  color: ${ThemingVariables.colors.text[1]};
  padding-top: 8px;
  font-weight: 500;
  font-size: 10px;
  line-height: 14px;
  padding-bottom: 4px;
  margin-top: 8px;
`

const DataAssestCardDescription = styled.div<{ isExpanded: boolean }>`
  font-style: normal;
  font-weight: normal;
  font-size: 10px;
  line-height: 12px;
  color: ${ThemingVariables.colors.text[1]};
`

const DataAssestCardTagsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -4px;
`

const DataAssestCardTag = styled.div`
  background: ${ThemingVariables.colors.gray[0]};
  border-radius: 4px;
  width: calc(50% - 8px);
  font-size: 10px;
  line-height: 14px;
  color: ${ThemingVariables.colors.text[1]};
  padding: 5px;
  text-align: center;
  background-color: #ffffff;
  margin-left: 4px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DataAssestCardTagInlineContainer = styled.div`
  margin-top: auto;
  overflow: hidden;
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 0;
  color: ${ThemingVariables.colors.gray[0]};
  > * + * {
    margin-left: 2px;
  }
`

const DataAssestCardTitle = styled.div`
  margin-bottom: 7px;
`

const DataAssestCardTagInlineWrapper = styled.div`
  display: inline-flex;
`

const DataAssestCardTagInline = styled.div`
  background: ${ThemingVariables.colors.primary[2]};
  border-radius: 4px;
  font-size: 10px;
  line-height: 14px;
  color: #ffffff;
  padding: 2px 4px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DataAssestCardContainer = styled.div`
  display: flex;
  align-items: center;
  cursor: grab;
  /* position: relative; */
  margin: 0 10px 8px 10px;
  padding: 10px;
  padding-bottom: 16px;
  user-select: none;
  position: relative;
  background-color: ${ThemingVariables.colors.gray[3]};
  flex-direction: column;
  align-items: stretch;
  border-radius: 8px;
  flex: 1;
  min-height: 110px;
  display: flex;
  box-shadow: 0px 0px 8px rgba(0, 0, 0, 0);
  overflow: hidden;
  :hover {
    box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.16);
    button {
      opacity: 1;
    }
  }
`

const Draggable: React.FC<{ element?: any; blockId: string; currentStoryId?: string }> = (props) => {
  const Element = props.element || 'div'
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `drag-${props.blockId}`,
    data: {
      type: DnDItemTypes.Block,
      originalBlockId: props.blockId,
      blockData: createEmptyBlock<Editor.VisualizationBlock>({
        type: Editor.BlockType.Visualization,
        storyId: props.currentStoryId,
        parentId: props.currentStoryId,
        content: {
          fromDataAssetId: props.blockId
        }
      })
    } as DndItemDataBlockType
  })

  return (
    <Element ref={setNodeRef} {...listeners} {...attributes}>
      {props.children}
    </Element>
  )
}

export const DataAssetItem: React.FC<{
  blockId: string
  isExpanded: boolean
  setExpanded?: (expanded: boolean) => void
}> = ({ blockId, isExpanded, setExpanded }) => {
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const block = useBlockSuspense<Editor.DataAssetBlock>(blockId)

  const snapshot = useQuerySnapshot(block.id)

  const fields = useMemo(
    () =>
      snapshot?.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [snapshot?.data.fields]
  )

  return (
    <DataAssestCardContainer
      style={{
        height: isExpanded ? 'auto' : 110
      }}
      onClick={() => {
        setExpanded?.(!isExpanded)
      }}
    >
      <IconCommonSmartQuery
        className={css`
          position: absolute;
          right: -10px;
          top: -30px;
          width: 76px;
          height: 76px;
          opacity: 0.03;
          pointer-events: none;
        `}
      />
      <DataAssestCardTitle
        className={css`
          display: flex;
        `}
      >
        <span
          className={css`
            color: ${ThemingVariables.colors.text[0]};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
            font-size: 12px;
            line-height: 15px;
            color: #333333;
          `}
        >
          {getBlockTitle(block)}
        </span>
        <DataAssestMenu
          block={block}
          className={css`
            margin-left: auto;
          `}
        />
      </DataAssestCardTitle>
      {block.content?.description && (
        <DataAssestCardDescription isExpanded={isExpanded}>{block.content?.description}</DataAssestCardDescription>
      )}
      {isExpanded ? (
        <>
          {Object.keys(block.content?.metrics ?? {}).length !== 0 && (
            <>
              <DataAssestCardSection>Metrics</DataAssestCardSection>
              <DataAssestCardTagsWrapper>
                {Object.keys(block.content?.metrics ?? {}).map((metricId) => {
                  const metric = block.content?.metrics?.[metricId]
                  if (!metric) return null
                  return <DataAssestCardTag key={metricId}>{metric?.name}</DataAssestCardTag>
                })}
              </DataAssestCardTagsWrapper>
            </>
          )}
          {fields?.length && (
            <>
              <DataAssestCardSection>Dimension</DataAssestCardSection>
              <DataAssestCardTagsWrapper>
                {fields?.map((field) => {
                  return <DataAssestCardTag key={field.name}>{field?.name}</DataAssestCardTag>
                })}
              </DataAssestCardTagsWrapper>
            </>
          )}
        </>
      ) : (
        <DataAssestCardTagInlineContainer>
          {Object.keys(block.content?.metrics ?? {}).map((metricId) => {
            const metric = block.content?.metrics?.[metricId]
            if (!metric) return null
            return (
              <DataAssestCardTagInlineWrapper key={metricId}>
                <DataAssestCardTagInline>{metric?.name}</DataAssestCardTagInline>
              </DataAssestCardTagInlineWrapper>
            )
          })}
        </DataAssestCardTagInlineContainer>
      )}
      <div
        className={css`
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          margin: auto;
          display: flex;
          justify-content: center;
        `}
      >
        <IconButton
          icon={IconCommonArrowDropDown}
          className={css`
            transition: all 150ms;
            opacity: 0;
          `}
          color={ThemingVariables.colors.gray[0]}
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)'
          }}
        ></IconButton>
      </div>
    </DataAssestCardContainer>
  )
}

const DataAssestMenu: React.FC<{ block: Editor.DataAssetBlock; className?: string }> = ({ block, className }) => {
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
        onClick={(e) => {
          e.stopPropagation()
          show()
        }}
        className={cx(
          'button',
          className,
          css`
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

export const AllMetricsSection: React.FC<{ storyId?: string; className?: string }> = ({ storyId, className }) => {
  const [keyword, setKeyword] = useState('')
  const metricBlocksQuery = useSearchMetrics(keyword, 1000)

  const dataAssetBlocks = useMemo(() => {
    const metricsBlocks = Object.values(metricBlocksQuery.data?.blocks ?? {}).filter(
      (block) => block.type === Editor.BlockType.QueryBuilder
    )
    return metricsBlocks
  }, [metricBlocksQuery.data?.blocks])

  const [expandedIndex, setExpandedIndex] = useState<number>(-1)

  return (
    <div
      className={cx(
        css`
          display: flex;
          flex-direction: column;
          height: 100%;
        `,
        className
      )}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          flex-shrink: 0;
          padding: 8px 10px;
          margin-bottom: 10px;
          border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
        `}
      >
        <IconCommonSearch color={ThemingVariables.colors.gray[0]} />
        <input
          placeholder="Search"
          className={css`
            border: none;
            outline: none;
            width: 100%;
            padding: 9px 10px;
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[0]};
            ::placeholder {
              color: ${ThemingVariables.colors.text[1]};
            }
          `}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.currentTarget.value)
          }}
        />
      </div>
      <div
        className={css`
          flex: 1;
          overflow: auto;
        `}
      >
        {dataAssetBlocks.map((block, index) => {
          return (
            <React.Suspense key={block.id} fallback={<DataAssestCardLoader />}>
              <Draggable blockId={block.id} currentStoryId={storyId}>
                <DataAssetItem
                  blockId={block.id}
                  isExpanded={expandedIndex === index}
                  setExpanded={(value) => {
                    if (value) {
                      setExpandedIndex(index)
                    } else {
                      setExpandedIndex(-1)
                    }
                  }}
                />
              </Draggable>
            </React.Suspense>
          )
        })}
      </div>
      {metricBlocksQuery.isLoading && (
        <div
          className={css`
            padding: 0 8px;
            margin-top: 10px;
            text-align: center;
          `}
        >
          {metricBlocksQuery.isLoading && <CircularLoading size={20} color={ThemingVariables.colors.primary[1]} />}
        </div>
      )}
    </div>
  )
}

export const SideBarDataAssets: React.FC<{ storyId: string }> = ({ storyId }) => {
  return <AllMetricsSection storyId={storyId} />
}
