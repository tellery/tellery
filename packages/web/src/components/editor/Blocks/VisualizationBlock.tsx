import {
  IconCommonBackLink,
  IconCommonError,
  IconCommonLink,
  IconCommonLock,
  IconCommonMore,
  IconCommonRefresh,
  IconCommonSetting,
  IconCommonSql,
  IconCommonUnlock,
  IconMenuDelete,
  IconMenuDownload,
  IconMenuDuplicate,
  IconMiscNoResult
} from '@app/assets/icons'
import IconButton from '@app/components/kit/IconButton'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
// import { MenuItem } from '@app/components/MenuItem'
// import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { RefreshButton } from '@app/components/RefreshButton'
import { TippySingletonContextProvider } from '@app/components/TippySingletonContextProvider'
import { charts } from '@app/components/v11n/charts'
import { Diagram } from '@app/components/v11n/Diagram'
import { Config, Data, Type } from '@app/components/v11n/types'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBindHovering, useOnScreen } from '@app/hooks'
import { useBlockSuspense, useGetSnapshot, useSnapshot, useUser } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { useFetchBlock } from '@app/hooks/useFetchBlock'
import { useInterval } from '@app/hooks/useInterval'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useSideBarQuestionEditor, useSideBarQuestionEditorState } from '@app/hooks/useSideBarQuestionEditor'
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { PopoverMotionVariants } from '@app/styles/animations'
import { Editor } from '@app/types'
import { addPrefixToBlockTitle, DEFAULT_TIPPY_DELAY, snapshotToCSV, TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx, keyframes } from '@emotion/css'
import Tippy from '@tippyjs/react'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import download from 'downloadjs'
import { AnimatePresence, motion } from 'framer-motion'
import html2canvas from 'html2canvas'
import React, {
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import DetectableOverflow from 'react-detectable-overflow'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useMeasure } from 'react-use'
import { Menu, MenuButton, MenuItem, MenuStateReturn, useMenuState } from 'reakit'
import invariant from 'tiny-invariant'
import { BlockingUI } from '../BlockBase/BlockingUIBlock'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { BlockTitle } from '../BlockTitle'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { createTranscation, insertBlocksAndMoveOperations, TellerySelectionType } from '../helpers'
import { getBlockImageById } from '../helpers/contentEditable'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '../utils'
import { BlockComponent, isExecuteableBlockType, registerBlock } from './utils'
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
        questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
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

const useVisualizationBlockInstructions = () => {
  const context = useContext(VisualizationInstructionsContext)
  return context
}

const _VisualizationBlock: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const editor = useEditor<Editor.VisualizationBlock>()
  const { block } = props
  const commit = useCommit()
  const snapshot = useBlockSnapshot()
  const [measureRef, rect] = useMeasure<HTMLDivElement>()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const queryId = block.content?.queryId
  const fromDataAssetId = block.content?.fromDataAssetId
  const fetchBlock = useFetchBlock()
  const instructions = useVisualizationBlockInstructionsProvider(block)

  useImperativeHandle(ref, () => instructions, [instructions])

  const createSmartQuery = useCallback(
    async (queryBuilderId: string) => {
      const queryBuilderBlock = await fetchBlock(queryBuilderId)
      const newQueryBlock = createEmptyBlock<Editor.SmartQueryBlock>({
        type: Editor.BlockType.SmartQuery,
        storyId: block.storyId!,
        parentId: block.storyId!,
        content: {
          title: addPrefixToBlockTitle(queryBuilderBlock.content?.title, 'smart query of '),
          queryBuilderId: queryBuilderId,
          metricIds: [],
          dimensions: []
        }
      })
      commit({
        transcation: createTranscation({
          operations: [
            ...insertBlocksAndMoveOperations({
              storyId: block.storyId!,
              blocksFragment: {
                children: [newQueryBlock.id],
                data: { [newQueryBlock.id]: newQueryBlock }
              },
              targetBlockId: block.id,
              direction: 'child',
              snapshot
            }),
            { cmd: 'set', path: ['content', 'queryId'], args: newQueryBlock.id, table: 'block', id: block.id }
          ]
        }),
        storyId: block.storyId!
      })
    },
    [block.id, block.storyId, commit, fetchBlock, snapshot]
  )

  useEffect(() => {
    if (!block.content) {
      // setIsPopoverOpen(true)
      editor?.updateBlockProps?.(block.id, ['content'], {
        title: [],
        format: {
          width: DEFAULT_QUESTION_BLOCK_WIDTH,
          aspectRatio: DEFAULT_QUESTION_BLOCK_ASPECT_RATIO
        }
      })
    }

    if (!queryId) {
      if (fromDataAssetId) {
        createSmartQuery(fromDataAssetId)
      } else {
        const newQueryBlock = createEmptyBlock({
          type: Editor.BlockType.SQL,
          storyId: block.storyId!,
          parentId: block.id!
        })
        commit({
          transcation: createTranscation({
            operations: [
              ...insertBlocksAndMoveOperations({
                storyId: block.storyId!,
                blocksFragment: {
                  children: [newQueryBlock.id],
                  data: { [newQueryBlock.id]: newQueryBlock }
                },
                targetBlockId: block.id!,
                direction: 'child',
                snapshot
              }),
              { cmd: 'set', path: ['content', 'queryId'], args: newQueryBlock.id, table: 'block', id: block.id }
            ]
          }),
          storyId: block.storyId!
        })
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [hoveringHandlers, hovering] = useBindHovering()
  const { small } = useBlockBehavior()
  const [sideBarQuestionEditorState, setSideBarQuestionEditorState] = useSideBarQuestionEditorState(block.storyId!)

  return (
    <VisualizationInstructionsContext.Provider value={instructions}>
      <div
        ref={(el) => {
          measureRef(el as unknown as HTMLDivElement)
          elementRef.current = el
        }}
        {...hoveringHandlers()}
        className={cx(
          QuestionsBlockContainer,
          sideBarQuestionEditorState?.blockId === block.id &&
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
                blockId: block.id
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
  const snapshotId = queryBlock?.content?.snapshotId
  const commit = useCommit()

  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(queryBlock.id)

  useEffect(() => {
    if (queryBlock.id && !snapshotId && (queryBlock as Editor.SQLBlock).content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute(queryBlock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <QuestionBlockBody snapshotId={snapshotId} visualization={visualization} />
      </React.Suspense>
    </>
  )
}

const VisualizationBlockContent = memo(_VisualizationBlockContent)

const VisualizationBlock = React.forwardRef(_VisualizationBlock) as BlockComponent<
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

registerBlock(Editor.BlockType.Visualization, VisualizationBlock)

export const QuestionBlockButtons: React.FC<{
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
  { snapshotId?: string; visualization?: Config<Type> }
> = ({ snapshotId, visualization }, ref) => {
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
        <LazyRenderDiagram data={snapshot?.data} config={visualizationConfig} />
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
              to={() => ({
                pathname: `/story/${queryBlock.storyId}`,
                hash: `#${queryBlock.parentId}`,
                state: {}
              })}
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

export const SnapshotUpdatedAt: React.FC<{
  loading: boolean
  queryBlock: Editor.QueryBlock
}> = ({ loading, queryBlock }) => {
  const snapshot = useSnapshot(queryBlock.content?.snapshotId)
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

export const LazyRenderDiagram: React.FC<{ data?: Data; config: Config<Type> }> = ({ data, config }) => {
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
        dimensions={dimensions}
        data={data}
        config={config as never}
        className={css`
          width: 100%;
          height: 100%;
        `}
      ></Diagram>
    ) : // <chart.Diagram dimensions={dimensions} data={data} config={config as never} />
    null
  }, [config, data, dimensions])

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

export const MoreDropdownSelect: React.FC<{
  block: Editor.VisualizationBlock
  className?: string
  hoverContent?: ReactNode
  setIsActive: (active: boolean) => void
}> = ({ block, setIsActive, className, hoverContent }) => {
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.VisualizationBlock>()
  const { readonly } = useBlockBehavior()
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(block.content?.queryId!)
  const canConvertDataAsset = !readonly && queryBlock.storyId === block.storyId
  const getSnapshot = useGetSnapshot()
  const questionEditor = useQuestionEditor(block.storyId!)
  const sideBarQuestionEditor = useSideBarQuestionEditor(block.storyId!)
  const { t } = useTranslation()
  const mutateSnapshot = useRefreshSnapshot()
  const canRefresh = !readonly && isExecuteableBlockType(queryBlock.type)
  const menu = useMenuState({ unstable_fixed: true, modal: true, animated: true })
  const blockTranscations = useBlockTranscations()

  useEffect(() => {
    setIsActive(menu.visible)
  }, [menu, setIsActive])

  const closeMenu = useCallback(() => {
    menu.hide()
  }, [menu])

  return (
    <>
      <MenuButton
        {...menu}
        hoverContent={hoverContent}
        color={ThemingVariables.colors.gray[5]}
        icon={IconCommonMore}
        as={IconButton}
        className={cx(
          css`
            border: none;
            background: transparent;
            outline: none;
            display: flex;
            align-items: center;
            justify-content: center;
            outline: none;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            padding: 0;
            cursor: pointer;
            background: transparent;
          `,
          className
        )}
      ></MenuButton>

      <Menu
        {...menu}
        hideOnClickOutside
        style={{
          outline: 'none',
          zIndex: 1000
        }}
        aria-label="menu"
      >
        <AnimatePresence>
          {menu.visible && (
            <motion.div
              initial={'inactive'}
              animate={'active'}
              exit={'inactive'}
              transition={{ duration: 0.15 }}
              variants={PopoverMotionVariants.scale}
              className={css`
                background: ${ThemingVariables.colors.gray[5]};
                box-shadow: ${ThemingVariables.boxShadows[0]};
                border-radius: 8px;
                padding: 8px;
                width: 260px;
                overflow: hidden;
                outline: none;
                display: flex;
                flex-direction: column;
              `}
            >
              <StyledMenuItem
                {...menu}
                title={t`Copy Link`}
                icon={<IconCommonLink color={ThemingVariables.colors.text[0]} />}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  copy('placeholder', {
                    onCopy: (clipboardData) => {
                      invariant(block, 'block is null')
                      const dataTranser = clipboardData as DataTransfer
                      if (!block.storyId) return

                      dataTranser.setData(
                        TELLERY_MIME_TYPES.BLOCK_REF,
                        JSON.stringify({ blockId: block.id, storyId: block.storyId })
                      )
                      dataTranser.setData(
                        'text/plain',
                        `${window.location.protocol}//${window.location.host}/story/${block?.storyId}#${block?.id}`
                      )
                    }
                  })
                  toast('Link Copied')
                  closeMenu()
                }}
              />
              <StyledMenuItem
                {...menu}
                title={t`Duplicate`}
                icon={<IconMenuDuplicate color={ThemingVariables.colors.text[0]} />}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const selection = editor?.getSelection()
                  editor?.duplicateHandler(
                    selection?.type === TellerySelectionType.Block ? selection.selectedBlocks : [block.id]
                  )
                  closeMenu()
                }}
              />
              <MenuItemDivider />
              {canRefresh && (
                <StyledMenuItem
                  {...menu}
                  title={t`Refresh question`}
                  icon={<IconCommonRefresh color={ThemingVariables.colors.text[0]} />}
                  onClick={() => {
                    mutateSnapshot.execute(queryBlock)
                    closeMenu()
                  }}
                />
              )}
              <StyledMenuItem
                {...menu}
                title={t`Question settings`}
                icon={<IconCommonSetting color={ThemingVariables.colors.text[0]} />}
                onClick={() => {
                  sideBarQuestionEditor.open({ blockId: block.id, activeTab: 'Visualization' })
                  closeMenu()
                }}
              />
              <StyledMenuItem
                {...menu}
                title={t`Open in editor`}
                icon={<IconCommonSql color={ThemingVariables.colors.text[0]} />}
                onClick={() => {
                  questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
                  closeMenu()
                }}
              />
              <StyledMenuItem
                {...menu}
                title={'Download as CSV'}
                icon={<IconMenuDownload color={ThemingVariables.colors.text[0]} />}
                onClick={async () => {
                  const snapshot = await getSnapshot({ snapshotId: queryBlock?.content?.snapshotId })
                  const snapshotData = snapshot?.data
                  invariant(snapshotData, 'snapshotData is null')
                  const csvString = snapshotToCSV(snapshotData)
                  invariant(csvString, 'csvString is null')
                  csvString && download(csvString, 'data.csv', 'text/csv')
                  closeMenu()
                }}
              />
              <StyledMenuItem
                {...menu}
                title={'Download as image'}
                icon={<IconMenuDownload color={ThemingVariables.colors.text[0]} />}
                onClick={async () => {
                  const elementSVG = getBlockImageById(block.id)
                  if (elementSVG) {
                    html2canvas(elementSVG!, {
                      foreignObjectRendering: false
                    }).then(function (canvas) {
                      const dataUrl = canvas.toDataURL('image/png')
                      download(dataUrl, 'image.png', 'image/png')
                    })
                  }
                  closeMenu()
                }}
              />
              {canConvertDataAsset && queryBlock.type === Editor.BlockType.SQL && (
                <Tippy
                  content="Freeze the data returned by the query to prevent accidental refreshing."
                  placement="left"
                  maxWidth={260}
                  delay={DEFAULT_TIPPY_DELAY}
                  arrow={false}
                >
                  <StyledMenuItem
                    {...menu}
                    title={'Freeze data'}
                    icon={<IconCommonLock color={ThemingVariables.colors.text[0]} />}
                    onClick={async () => {
                      editor?.updateBlockProps?.(queryBlock.id, ['type'], Editor.BlockType.SnapshotBlock)
                      closeMenu()
                    }}
                  />
                </Tippy>
              )}
              {canConvertDataAsset && queryBlock.type === Editor.BlockType.SnapshotBlock && (
                <StyledMenuItem
                  {...menu}
                  title={'Unfreeze data'}
                  icon={<IconCommonUnlock color={ThemingVariables.colors.text[0]} />}
                  onClick={async () => {
                    editor?.updateBlockProps?.(queryBlock.id, ['type'], Editor.BlockType.SQL)
                    closeMenu()
                  }}
                />
              )}
              {/* {canConvertDataAsset && dataAssetBlock.type === Editor.BlockType.QueryBuilder && (
          <StyledMenuItem
            {...menu}
            title={'Remove from data assets'}
            icon={<IconCommonTurn color={ThemingVariables.colors.text[0]} />}
            onClick={async () => {
              editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.SQL)
            }}
          />
        )}
        {canConvertDataAsset && dataAssetBlock.type === Editor.BlockType.QueryBuilder && (
          <StyledMenuItem
            {...menu}
            title={'Add to data assets'}
            icon={<IconCommonMetrics color={ThemingVariables.colors.text[0]} />}
            onClick={async () => {
              editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.QueryBuilder)
            }}
          />
        )} */}
              {/* {canConvertDataAsset && dataAssetBlock.type === Editor.BlockType.SmartQuery && (
          <StyledMenuItem
            {...menu}
            title={'Convert to SQL query'}
            icon={<IconCommonMetrics color={ThemingVariables.colors.text[0]} />}
            onClick={async () => {
              editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.SQL)
            }}
          />
        )} */}
              <MenuItemDivider />

              {!readonly && (
                <StyledMenuItem
                  {...menu}
                  title={'Delete'}
                  icon={<IconMenuDelete color={ThemingVariables.colors.text[0]} />}
                  onClick={async () => {
                    // requestClose()

                    // TODO: a workaround to transition
                    setTimeout(() => {
                      blockTranscations.removeBlocks(block.storyId!, [block.id])
                    }, 100)
                  }}
                />
              )}

              {block?.lastEditedById && (
                <>
                  <MenuItemDivider />
                  <div
                    className={css`
                      color: ${ThemingVariables.colors.text[1]};
                      font-size: 12px;
                      padding: 0 10px;
                    `}
                  >
                    Last edited by {user?.name}
                    <br />
                    {dayjs(block.updatedAt).format('YYYY-MM-DD')}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Menu>
    </>
  )
}

const _StyledMenuItem: React.ForwardRefRenderFunction<
  any,
  {
    icon?: ReactNode
    title: ReactNode
    side?: ReactNode
    isActive?: boolean
    size?: 'small' | 'medium' | 'large'
    onClick?: React.MouseEventHandler<HTMLButtonElement>
  } & MenuStateReturn
> = (props, ref) => {
  const { size = 'medium', title, side, isActive, onClick, icon, children, ...rest } = props
  return (
    <MenuItem
      {...rest}
      ref={ref}
      className={cx(
        size === 'small' &&
          css`
            height: 24px;
          `,
        size === 'medium' &&
          css`
            height: 36px;
          `,
        size === 'large' &&
          css`
            height: 44px;
          `,
        css`
          border-radius: 8px;
          padding: 0px 8px;
          outline: none;
          border: none;
          width: 100%;
          background: transparent;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.1s ease;
          display: block;
          color: ${ThemingVariables.colors.text[0]};
          font-size: 12px;
          line-height: 14px;
          text-decoration: none;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          display: flex;
          align-items: center;
          &:hover {
            background: ${ThemingVariables.colors.primary[4]};
          }
          &:active {
            background: ${ThemingVariables.colors.primary[3]};
          }
        `,
        props.isActive &&
          css`
            background: ${ThemingVariables.colors.primary[3]};
          `
      )}
      onClick={props.onClick}
    >
      {props?.icon}
      <span
        className={css`
          margin-left: 8px;
        `}
      >
        {props.title}
      </span>
      {props.side && (
        <div
          className={css`
            margin-left: auto;
          `}
        >
          {props.side}
        </div>
      )}
    </MenuItem>
  )
}

const StyledMenuItem = forwardRef(_StyledMenuItem)

const VisBlockRefereshButton: React.FC<{
  block: Editor.VisualizationBlock
  hoverContent?: ReactNode
  className: string
}> = ({ block, hoverContent, className }) => {
  const dataAssetBlock = useBlockSuspense(block.content!.queryId!)
  const { readonly } = useBlockBehavior()
  const mutateSnapshot = useRefreshSnapshot()
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
  const questionEditor = useQuestionEditor(block.storyId!)
  const sideBarQuestionEditor = useSideBarQuestionEditor(block.storyId!)
  const isOriginalQuestion = useMemo(() => {
    if (block.children?.length && block.content?.queryId) {
      return block.children.indexOf(block.content.queryId) !== -1
    }
    return false
  }, [block.children, block.content?.queryId])
  return (
    <div
      className={css`
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      `}
    >
      <TippySingletonContextProvider delay={500} arrow={false}>
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
                onClick={() => questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })}
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
      </TippySingletonContextProvider>
    </div>
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
