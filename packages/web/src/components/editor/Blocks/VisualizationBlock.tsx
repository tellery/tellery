import {
  IconCommonBackLink,
  IconCommonError,
  IconCommonLock,
  IconCommonRefresh,
  IconCommonSetting,
  IconCommonSql,
  IconMiscNoResult
} from '@app/assets/icons'
import IconButton from '@app/components/kit/IconButton'
import { RefreshButton } from '@app/components/RefreshButton'
import { TippySingletonContextProvider } from '@app/components/TippySingletonContextProvider'
import { charts } from '@app/components/v11n/charts'
import { Diagram } from '@app/components/v11n/Diagram'
import { Config, Data, Type } from '@app/components/v11n/types'
import { useOnScreen } from '@app/hooks'
import { useBlockSuspense, useQuerySnapshot, useQuerySnapshotId, useSnapshot } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useInterval } from '@app/hooks/useInterval'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useSideBarQuestionEditor, useSideBarRightState } from '@app/hooks/useSideBarQuestionEditor'
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { css, cx, keyframes } from '@emotion/css'
import Tippy from '@tippyjs/react'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import React, { memo, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import DetectableOverflow from 'react-detectable-overflow'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useHoverDirty, useMeasure } from 'react-use'
import { BlockingUI } from '../BlockBase/BlockingUIBlock'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { BlockTitle } from '../BlockTitle'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { createTranscation } from '../helpers'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { blockManuallyCreatedSubject } from '../oberveables'
import { MoreDropdownSelect } from './menus/MoreDropdownSelect'
import { BlockComponent, isExecuteableBlockType } from './utils'
const FOOTER_HEIGHT = 20
const BORDER_WIDTH = 0

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

const useVisualizationBlockInstructionsProvider = (block: Editor.VisualizationBlock) => {
  const commit = useCommit()
  const questionEditor = useQuestionEditor(block.storyId!)
  const fromQueryId = block.content?.fromQueryId

  const instructions = useMemo(
    () => ({
      openMenu: () => {
        questionEditor.open({ blockId: block.id, storyId: block.storyId! })
      },
      restoreOriginalQueryId: async () => {
        if (!fromQueryId) return
        const operations = []
        operations.push({ cmd: 'set', path: ['content', 'queryId'], args: fromQueryId, table: 'block', id: block.id })
        if (block.children?.length) {
          for (let i = 0; i < block.children.length; i++) {
            const childId = block.children[i]
            operations.push({
              cmd: 'listRemove',
              path: ['children'],
              args: { id: childId },
              table: 'block',
              id: block.id
            })
            operations.push({ cmd: 'update', path: ['alive'], args: false, table: 'block', id: childId })
          }
        }
        commit({
          transcation: createTranscation({
            operations: operations
          }),
          storyId: block.storyId!
        })
      }
    }),
    [block.children, block.id, block.storyId, commit, fromQueryId, questionEditor]
  )
  return instructions
}

const VisualizationInstructionsContext = React.createContext<ReturnType<
  typeof useVisualizationBlockInstructionsProvider
> | null>(null)

const _VisualizationBlock: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const editor = useEditor<Editor.VisualizationBlock>()
  const { block } = props
  const [measureRef, rect] = useMeasure<HTMLDivElement>()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const queryId = block.content!.queryId!
  const instructions = useVisualizationBlockInstructionsProvider(block)
  const sidebarEditor = useSideBarQuestionEditor(block.storyId!)
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(queryId)

  useImperativeHandle(ref, () => instructions, [instructions])

  useEffect(() => {
    const subscription = blockManuallyCreatedSubject.subscribe((blockId) => {
      if (queryBlock.type === Editor.BlockType.SmartQuery) {
        if (blockId === block.id) {
          sidebarEditor.open({ blockId: block.id, activeTab: 'Query' })
        }
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [block.id, queryBlock.type, sidebarEditor])

  const hovering = useHoverDirty(elementRef)

  const { small } = useBlockBehavior()
  const [sideBarQuestionEditorState, setSideBarQuestionEditorState] = useSideBarRightState(block.storyId!)

  return (
    <VisualizationInstructionsContext.Provider value={instructions}>
      <div
        ref={(el) => {
          measureRef(el as unknown as HTMLDivElement)
          elementRef.current = el
        }}
        // {...hoveringHandlers()}
        className={cx(
          QuestionsBlockContainer,
          sideBarQuestionEditorState?.data?.blockId === block.id &&
            css`
              :before {
                content: ' ';
                position: absolute;
                width: 100%;
                height: 100%;
                left: 0;
                top: 0;
                box-sizing: border-box;
                border-radius: 20px;
                border: 4px solid transparent;
                pointer-events: none;
                border-color: ${ThemingVariables.colors.primary[3]};
              }
            `
        )}
        onClick={(e) => {
          editor?.setSelectionState(null)
          setSideBarQuestionEditorState((state) => {
            if (state !== null) {
              return {
                ...state,
                type: 'Question',
                data: { ...state.data, blockId: block.id }
              }
            }
            return state
          })
          e.stopPropagation()
        }}
      >
        <React.Suspense fallback={<></>}>
          {block.content?.queryId && <QuestionBlockHeader block={block} />}
          {!small && <QuestionBlockButtons block={block} show={hovering} slim={rect.width < 260} />}
        </React.Suspense>

        {queryId === undefined ? (
          <BlockPlaceHolder loading={false} text="New Question" />
        ) : (
          <VisualizationBlockBody
            queryId={queryId}
            block={block}
            blockFormat={props.blockFormat}
            parentType={props.parentType}
          />
        )}
      </div>
    </VisualizationInstructionsContext.Provider>
  )
}

const _VisualizationBlockBody: React.FC<{
  queryId: string
  blockFormat: BlockFormatInterface
  block: Editor.VisualizationBlock
  parentType: Editor.BlockType
}> = ({ queryId, blockFormat, block, parentType }) => {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const { readonly } = useBlockBehavior()
  return (
    <>
      <React.Suspense fallback={<></>}>
        <QuestionBlockStatus queryId={queryId} />
      </React.Suspense>

      <motion.div
        style={{
          paddingTop: blockFormat.paddingTop
        }}
        transition={{ duration: 0 }}
        className={css`
          position: relative;
          display: inline-block;
          width: calc(100% + ${2 * BORDER_WIDTH + 2}px);
          min-height: 100px;
        `}
        ref={contentRef}
      >
        <React.Suspense fallback={<BlockingUI blocking />}>
          <VisualizationBlockContent
            queryId={queryId}
            block={block}
            blockFormat={blockFormat}
            parentType={parentType}
          />
        </React.Suspense>
        {readonly === false && (
          <BlockResizer
            blockFormat={blockFormat}
            contentRef={contentRef}
            parentType={parentType}
            blockId={block.id}
            offsetY={FOOTER_HEIGHT}
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

const VisualizationBlockBody = memo(_VisualizationBlockBody)

const _VisualizationBlockContent: React.FC<{
  queryId: string
  block: Editor.VisualizationBlock
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}> = ({ queryId, block }) => {
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(queryId)
  const snapshotId = useQuerySnapshotId(queryId)
  const commit = useCommit()

  const visualization = block.content?.visualization

  // TODO: Compact code
  useEffect(() => {
    if (queryId && block.children?.includes(queryId) && queryBlock.parentId !== block.id) {
      commit({
        transcation: createTranscation({
          operations: [{ cmd: 'update', path: ['parentId'], args: block.id, table: 'block', id: queryId }]
        }),
        storyId: block.storyId!
      })
    }
  }, [block.children, block.id, block.storyId, commit, queryBlock.parentId, queryId])

  return (
    <>
      <React.Suspense fallback={<BlockingUI blocking />}>
        <QuestionBlockBody
          storyId={block.storyId!}
          blockId={block.id}
          dimensions={
            queryBlock.type === Editor.BlockType.SmartQuery
              ? (queryBlock as Editor.SmartQueryBlock).content.dimensions
              : undefined
          }
          snapshotId={snapshotId}
          visualization={visualization}
        />
      </React.Suspense>
    </>
  )
}

const VisualizationBlockContent = memo(_VisualizationBlockContent)

export const VisualizationBlock = React.forwardRef(_VisualizationBlock) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

VisualizationBlock.meta = {
  isText: false,
  forwardRef: true,
  hasChildren: false,
  isQuestion: true,
  isResizeable: true,
  isExecuteable: true
}

const QuestionBlockButtons: React.FC<{
  block: Editor.VisualizationBlock
  show: boolean
  slim: boolean
}> = ({ block, show, slim }) => {
  const [isActive, setIsActive] = useState(false)

  const content = useMemo(
    () => <TitleButtonsInner block={block} slim={slim} setIsActive={setIsActive} />,
    [block, slim]
  )

  return (
    <motion.div
      transition={{ duration: 0.25 }}
      style={{
        opacity: show || isActive ? 1 : 0
      }}
      className={css`
        position: absolute;
        right: 0;
        top: 0;
        margin: 10px;
        background: rgba(51, 51, 51, 0.7);
        border-radius: 8px;
        transition: opacity 250ms ease-in-out;
        overflow: hidden;
      `}
    >
      {content}
    </motion.div>
  )
}

const _QuestionBlockBody: React.ForwardRefRenderFunction<
  HTMLDivElement | null,
  {
    storyId: string
    blockId: string
    dimensions?: Dimension[]
    snapshotId?: string | null
    visualization?: Config<Type>
  }
> = ({ storyId, blockId, dimensions, snapshotId, visualization }, ref) => {
  const snapshot = useSnapshot(snapshotId)

  const visualizationConfig = useMemo(() => {
    // ensure snapshot data is valid
    if (snapshot?.data && typeof snapshot?.data === 'object' && !snapshot.data.errMsg) {
      return visualization ?? charts[Type.TABLE].initializeConfig(snapshot.data, { cache: {}, dimensions })
    } else {
      return undefined
    }
  }, [snapshot, visualization, dimensions])

  return (
    <div
      ref={ref}
      onCopy={(e) => {
        e.stopPropagation()
      }}
      className={css`
        height: 100%;
        width: 100%;
        min-height: 100px;
        min-width: 100px;
        user-select: text;
        position: absolute;
        padding: 0 ${20 + BORDER_WIDTH}px;
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

const _QuestionBlockHeader: React.FC<{
  block: Editor.VisualizationBlock
}> = ({ block }) => {
  const { t } = useTranslation()
  const queryBlock = useBlockSuspense(block.content!.queryId!)
  const isReference = queryBlock.parentId !== block.id
  const [disableTippy, setDisableTippy] = useState(true)

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
        {isReference && (
          <Tippy content={t`Click to navigate to the original story`} arrow={false}>
            <Link
              replace
              to={{
                pathname: `/story/${queryBlock.storyId}`,
                hash: `#${queryBlock.parentId}`
              }}
              state={{}}
            >
              <IconCommonBackLink
                className={css`
                  margin-right: 5px;
                  flex-shrink: 0;
                `}
              />
            </Link>
          </Tippy>
        )}
        {queryBlock.type === Editor.BlockType.SnapshotBlock && (
          <IconCommonLock
            className={css`
              margin-right: 5px;
              flex-shrink: 0;
            `}
          />
        )}
        <Tippy
          content={<BlockTitle block={queryBlock} />}
          placement="top-start"
          arrow={false}
          delay={350}
          disabled={disableTippy}
        >
          <div
            className={css`
              font-style: normal;
              font-weight: 600;
              font-size: 1em;
              line-height: 1.2;
              color: ${ThemingVariables.colors.text[0]};
              align-self: stretch;
              position: relative;
              display: flex;
              overflow: hidden;
            `}
          >
            <DetectableOverflow
              className={css``}
              onChange={(overflowed) => {
                setDisableTippy(!overflowed)
              }}
            >
              <BlockTitle block={queryBlock} />
            </DetectableOverflow>
          </div>
        </Tippy>
      </div>
    </>
  )
}

const QuestionBlockHeader = memo(_QuestionBlockHeader)

const _QuestionBlockStatus: React.FC<{
  queryId: string
}> = ({ queryId }) => {
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(queryId)
  const mutatingCount = useSnapshotMutating(queryBlock.id)

  const loading = mutatingCount !== 0

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
          <React.Suspense fallback={<></>}>
            <SnapshotUpdatedAt loading={loading} queryBlock={queryBlock} />
          </React.Suspense>
        </div>
      </div>
    </>
  )
}
const QuestionBlockStatus = memo(_QuestionBlockStatus)

const SnapshotUpdatedAt: React.FC<{
  loading: boolean
  queryBlock: Editor.QueryBlock
}> = ({ loading, queryBlock }) => {
  const snapshot = useQuerySnapshot(queryBlock.id)
  const [mutatingStartTimeStamp, setMutatingStartTimeStamp] = useState(0)
  const [nowTimeStamp, setNowTimeStamp] = useState(0)
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
      {loading
        ? dayjs(nowTimeStamp).subtract(mutatingStartTimeStamp).format('mm:ss')
        : snapshot?.createdAt ?? queryBlock.content?.lastRunAt
        ? dayjs(queryBlock.content?.lastRunAt ?? snapshot?.createdAt).fromNow()
        : ''}
    </>
  )
}

const LazyRenderDiagram: React.FC<{ storyId: string; blockId: string; data?: Data; config: Config<Type> }> = ({
  storyId,
  blockId,
  data,
  config
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)
  const isOnSCreen = useOnScreen(ref)
  const [dimensions, setDimensions] = useState<DOMRect>()

  useEffect(() => {
    if (isOnSCreen && !rendered) {
      setRendered(true)
    }
  }, [isOnSCreen, rendered])

  const onDimensionsUpdate = useCallback((dimensions?: DOMRect) => {
    setDimensions(dimensions)
  }, [])

  const diagram = useMemo(() => {
    return dimensions && data ? (
      <Diagram
        storyId={storyId}
        blockId={blockId}
        dimensions={dimensions}
        data={data}
        config={config as never}
        className={css`
          width: 100%;
          height: 100%;
        `}
      ></Diagram>
    ) : null
  }, [blockId, config, data, dimensions, storyId])

  return (
    <DebouncedResizeBlock
      onDimensionsUpdate={onDimensionsUpdate}
      showOverlay
      overflowHidden
      leading={rendered === false}
    >
      <div
        style={
          dimensions
            ? {
                width: dimensions.width,
                height: dimensions.height
              }
            : undefined
        }
        ref={ref}
        className={cx(
          css`
            padding: 0px;
          `,
          'no-select',
          'diagram'
        )}
      >
        {rendered ? diagram : null}
      </div>
    </DebouncedResizeBlock>
  )
}

const VisBlockRefereshButton: React.FC<{
  block: Editor.VisualizationBlock
  hoverContent?: ReactNode
  className: string
}> = ({ block, hoverContent, className }) => {
  const dataAssetBlock = useBlockSuspense(block.content!.queryId!)
  const { readonly } = useBlockBehavior()
  const mutateSnapshot = useRefreshSnapshot(block.storyId!)
  const mutatingCount = useSnapshotMutating(dataAssetBlock.id)
  const loading = mutatingCount !== 0
  return !readonly && isExecuteableBlockType(dataAssetBlock.type) ? (
    <RefreshButton
      color={ThemingVariables.colors.gray[5]}
      loading={loading}
      hoverContent={hoverContent}
      className={className}
      onClick={loading ? () => mutateSnapshot.cancel(dataAssetBlock.id) : () => mutateSnapshot.execute(dataAssetBlock)}
    />
  ) : null
}

const TitleButtonsInner: React.FC<{
  block: Editor.VisualizationBlock
  slim: boolean
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>
}> = ({ block, slim, setIsActive }) => {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const questionEditor = useQuestionEditor(block.storyId!)
  const sideBarQuestionEditor = useSideBarQuestionEditor(block.storyId!)
  const isOriginalQuestion = useMemo(() => {
    if (block.children?.length && block.content?.queryId) {
      return block.children.indexOf(block.content.queryId) !== -1
    }
    return false
  }, [block.children, block.content?.queryId])

  return (
    <TippySingletonContextProvider delay={500} arrow={false} hideOnClick>
      <div
        className={css`
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        `}
        ref={ref}
      >
        {slim === false && (
          <>
            {block.content?.queryId && (
              <VisBlockRefereshButton className={QuestionBlockIconButton} hoverContent={t`Refresh`} block={block} />
            )}
            <IconButton
              hoverContent={t`Settings`}
              icon={IconCommonSetting}
              color={ThemingVariables.colors.gray[5]}
              onClick={() => sideBarQuestionEditor.open({ blockId: block.id, activeTab: 'Visualization' })}
              className={QuestionBlockIconButton}
            />
            {isOriginalQuestion && (
              <IconButton
                hoverContent={t`Edit SQL`}
                className={QuestionBlockIconButton}
                icon={IconCommonSql}
                color={ThemingVariables.colors.gray[5]}
                onClick={() => questionEditor.open({ blockId: block.id, storyId: block.storyId! })}
              />
            )}
          </>
        )}
        {block.content?.queryId && (
          <MoreDropdownSelect
            hoverContent={t`More`}
            block={block}
            setIsActive={setIsActive}
            className={QuestionBlockIconButton}
          />
        )}
      </div>
    </TippySingletonContextProvider>
  )
}

const QuestionBlockIconButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  cursor: pointer;
  padding: 5px;
  :hover {
    background: ${ThemingVariables.colors.text[0]};
  }
`

const QuestionsBlockContainer = css`
  cursor: default;
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  background-color: ${ThemingVariables.colors.gray[4]};
  border-radius: 20px;
`
