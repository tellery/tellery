import { IconCommonError, IconCommonRefresh, IconMiscNoResult } from '@app/assets/icons'
import { charts } from '@app/components/v11n/charts'
import { Config, Type } from '@app/components/v11n/types'
import { useQuerySnapshotId, useSnapshot } from '@app/hooks/api'
import { useInterval } from '@app/hooks/useInterval'
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css, cx, keyframes } from '@emotion/css'
import Tippy from '@tippyjs/react'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { BlockComponent, registerBlock } from './utils'
import { LazyRenderDiagram } from './VisualizationBlock'

const FOOTER_HEIGHT = 20

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
`

interface QuestionBlockProps {
  block: Editor.VisualizationBlock
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}

const _DataAssetBlockTablePreview: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const { block } = props
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [blockFocusing, setBlockFocusing] = useState(false)

  return (
    <div
      ref={elementRef}
      className={QuestionsBlockContainer}
      tabIndex={-1}
      onFocus={() => setBlockFocusing(true)}
      onBlur={() => setBlockFocusing(false)}
    >
      <VisualizationBlockContent
        block={block}
        wrapperRef={elementRef}
        blockFocusing={blockFocusing}
        blockFormat={props.blockFormat}
      />
    </div>
  )
}

const VisualizationBlockContent: React.FC<{
  block: Editor.QueryBlock
  wrapperRef: React.MutableRefObject<HTMLDivElement | null>
  blockFocusing: boolean
  blockFormat: BlockFormatInterface
}> = ({ block, blockFormat }) => {
  const queryBlock = block
  const snapshotId = useQuerySnapshotId(block.storyId!, block.id)
  const mutateSnapshot = useRefreshSnapshot(block.storyId!)
  const mutatingCount = useSnapshotMutating(queryBlock.id)

  useEffect(() => {
    if (queryBlock.id && !snapshotId && (queryBlock as Editor.SQLBlock).content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute(queryBlock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contentRef = useRef<HTMLDivElement | null>(null)

  return (
    <>
      <QuestionBlockHeader setTitleEditing={() => {}} titleEditing={false} block={block} queryBlock={queryBlock} />
      {snapshotId && <QuestionBlockStatus snapshotId={snapshotId} block={block} queryBlock={queryBlock} />}
      <motion.div
        style={{
          paddingTop: blockFormat.paddingTop
        }}
        transition={{ duration: 0 }}
        className={css`
          position: relative;
          display: inline-block;
          width: 100%;
          min-height: 100px;
        `}
      >
        {snapshotId && (
          <QuestionBlockBody
            ref={contentRef}
            storyId={block.storyId!}
            blockId={block.id}
            snapshotId={snapshotId}
            visualization={(block as Editor.VisualizationBlock).content?.visualization}
          />
        )}
      </motion.div>
      <div
        className={css`
          height: ${FOOTER_HEIGHT}px;
        `}
      />
    </>
  )
}

const DataAssetBlockTablePreviewExecuteable = React.forwardRef(_DataAssetBlockTablePreview) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

const SQLBlock = React.forwardRef(_DataAssetBlockTablePreview) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

const DataAssetBlockTablePreview = React.forwardRef(_DataAssetBlockTablePreview) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

const SnapshotBlock = React.forwardRef(_DataAssetBlockTablePreview) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

const SmartQueryBlock = React.forwardRef(_DataAssetBlockTablePreview) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

DataAssetBlockTablePreviewExecuteable.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: true,
  isQuery: true
}

SQLBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: false,
  isQuery: true
}

DataAssetBlockTablePreview.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: true,
  isQuery: true
}

SnapshotBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: false,
  isDataAsset: false,
  isQuery: true
}

SmartQueryBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isExecuteable: true,
  isDataAsset: false,
  isQuery: true
}

registerBlock(Editor.BlockType.SQL, SQLBlock)
registerBlock(Editor.BlockType.SnapshotBlock, SnapshotBlock)
registerBlock(Editor.BlockType.SmartQuery, SmartQueryBlock)
registerBlock(Editor.BlockType.QueryBuilder, DataAssetBlockTablePreviewExecuteable)
registerBlock(Editor.BlockType.DBT, DataAssetBlockTablePreview)

const _QuestionBlockBody: React.ForwardRefRenderFunction<
  HTMLDivElement | null,
  { storyId: string; blockId: string; snapshotId?: string; visualization?: Config<Type> }
> = ({ storyId, blockId, snapshotId, visualization }, ref) => {
  const snapshot = useSnapshot(snapshotId)

  const visualizationConfig = useMemo(() => {
    // ensure snapshot data is valid
    if (snapshot?.data && typeof snapshot?.data === 'object' && !snapshot.data.errMsg) {
      return visualization ?? charts[Type.TABLE].initializeConfig(snapshot.data, {})
    } else {
      return undefined
    }
  }, [snapshot, visualization])

  return (
    <div
      ref={ref}
      onCopy={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      className={css`
        height: 100%;
        width: 100%;
        min-height: 100px;
        min-width: 100px;
        user-select: text;
        position: absolute;
        padding: 0 20px;
        left: 0;
        top: 0;
      `}
    >
      {visualizationConfig && snapshot?.data && snapshot.data.fields ? (
        <LazyRenderDiagram storyId={storyId} blockId={blockId} data={snapshot?.data} config={visualizationConfig} />
      ) : (
        <div
          className={css`
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          `}
        >
          <IconMiscNoResult />
          <div
            className={css`
              font-style: normal;
              font-weight: 500;
              font-size: 14px;
              line-height: 17px;
              color: ${ThemingVariables.colors.primary[1]};
              opacity: 0.3;
              margin-top: 10px;
            `}
          >
            No Result
          </div>
        </div>
      )}
    </div>
  )
}

const QuestionBlockBody = React.forwardRef(_QuestionBlockBody)

const QuestionBlockHeader: React.FC<{
  setTitleEditing: React.Dispatch<React.SetStateAction<boolean>>
  block: Editor.VisualizationBlock
  titleEditing: boolean
  queryBlock: Editor.QueryBlock
}> = ({ setTitleEditing, block, titleEditing, queryBlock }) => {
  const { readonly } = useBlockBehavior()

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-start;
          align-self: stretch;
          padding: 20px 20px 0 20px;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            flex: 1;
          `}
        >
          <div
            className={cx(
              css`
                font-style: normal;
                font-weight: 600;
                font-size: 1em;
                line-height: 1.2;
                color: ${ThemingVariables.colors.text[0]};
                flex: 1;
                cursor: text;
                align-self: stretch;
                position: relative;
                display: flex;
              `
            )}
            onMouseDown={() => {
              setTitleEditing(true)
            }}
          >
            <ContentEditable
              block={queryBlock}
              disableReferenceDropdown
              disableSlashCommand
              disableTextToolBar
              readonly={titleEditing === false || readonly}
              maxLines={titleEditing ? undefined : 1}
              placeHolderText={DEFAULT_TITLE}
              placeHolderStrategy={'always'}
            />
          </div>
        </div>
      </div>
    </>
  )
}

const QuestionBlockStatus: React.FC<{
  block: Editor.VisualizationBlock
  queryBlock: Editor.QueryBlock
  snapshotId?: string
}> = ({ block, queryBlock, snapshotId }) => {
  const snapshot = useSnapshot(snapshotId)
  const mutatingCount = useSnapshotMutating(queryBlock.id)
  const [mutatingStartTimeStamp, setMutatingStartTimeStamp] = useState(0)
  const [nowTimeStamp, setNowTimeStamp] = useState(0)
  const loading = mutatingCount !== 0

  useEffect(() => {
    if (loading) {
      setNowTimeStamp(Date.now())
      setMutatingStartTimeStamp(Date.now())
    }
  }, [loading])

  useInterval(() => {
    setNowTimeStamp(Date.now())
  }, 1000)

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-start;
          align-self: stretch;
          padding: 3px 20px 20px;
          height: 37px;
          overflow: hidden;
        `}
      >
        <Tippy
          content={
            queryBlock.content?.error ? (
              <div
                className={css`
                  max-height: 100px;
                  overflow: auto;
                `}
              >
                {queryBlock.content?.error}
              </div>
            ) : (
              'loading...'
            )
          }
          // hideOnClick={true}
          // theme="tellery"
          animation="fade"
          duration={150}
          arrow={false}
          interactive
          // trigger="click"
          popperOptions={{
            modifiers: [
              {
                name: 'offset',
                enabled: true,
                options: {
                  offset: [10, 20]
                }
              }
            ]
          }}
        >
          <div
            className={css`
              > * {
                margin-right: 5px;
              }
            `}
          >
            {loading ? (
              <>
                <IconCommonRefresh
                  width="12px"
                  height="12px"
                  fill={ThemingVariables.colors.warning[0]}
                  className={css`
                    animation: ${rotateAnimation} 1.2s linear infinite;
                  `}
                />
              </>
            ) : queryBlock.content?.error ? (
              <>
                <IconCommonError width="12px" height="12px" fill={ThemingVariables.colors.negative[0]} />
              </>
            ) : null}
          </div>
        </Tippy>

        <div
          className={css`
            flex-grow: 0;
            flex-shrink: 1;
            overflow: hidden;
            align-items: center;
            font-weight: 600;
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.text[2]};
            white-space: nowrap;
            text-overflow: ellipsis;
            display: inline-flex;
          `}
        >
          {loading
            ? dayjs(nowTimeStamp).subtract(mutatingStartTimeStamp).format('mm:ss')
            : snapshot?.createdAt ?? queryBlock.content?.lastRunAt
            ? dayjs(queryBlock.content?.lastRunAt ?? snapshot?.createdAt).fromNow()
            : ''}
        </div>
      </div>
    </>
  )
}

const QuestionsBlockContainer = css`
  cursor: default;
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  background-color: ${ThemingVariables.colors.gray[4]};
  border-radius: 20px;
  border: 4px solid transparent;
  :focus-within {
    border-color: ${ThemingVariables.colors.primary[3]};
    outline: none;
  }
`
