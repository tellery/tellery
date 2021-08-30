import {
  IconCommonBackLink,
  IconCommonCopy,
  IconCommonError,
  IconCommonLink,
  IconCommonLock,
  IconCommonMetrics,
  IconCommonMore,
  IconCommonRefresh,
  IconCommonSql,
  IconCommonTurn,
  IconCommonUnlock,
  IconMenuDownload,
  IconMiscNoResult,
  IconVisualizationSetting
} from '@app/assets/icons'
import IconButton from '@app/components/kit/IconButton'
import { MenuItem } from '@app/components/MenuItem'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { RefreshButton } from '@app/components/RefreshButton'
import { Diagram } from '@app/components/v11n'
import { charts } from '@app/components/v11n/charts'
import { Config, Data, Type } from '@app/components/v11n/types'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBindHovering, useOnScreen } from '@app/hooks'
import { useBlockSuspense, useGetSnapshot, useSnapshot, useUser } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useFetchBlock } from '@app/hooks/useFetchBlock'
import { useInterval } from '@app/hooks/useInterval'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { BlockResourcesAtom, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { snapshotToCSV, TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx, keyframes } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import download from 'downloadjs'
import { useSelect } from 'downshift'
import { AnimatePresence, motion, usePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import React, {
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
import { useRecoilValue } from 'recoil'
import invariant from 'tiny-invariant'
import { BlockingUI } from '../BlockBase/BlockingUIBlock'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { BlockTitle } from '../BlockTitle'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { EditorPopover } from '../EditorPopover'
import { createTranscation, insertBlocksAndMoveOperations } from '../helpers'
import { getBlockImageById } from '../helpers/contentEditable'
import { useEditor } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import type { OperationInterface } from '../Popovers/BlockOperationPopover'
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

const useVisulizationBlockInstructionsProvider = (block: Editor.VisualizationBlock) => {
  const commit = useCommit()
  const fetchBlock = useFetchBlock()
  const questionEditor = useQuestionEditor(block.storyId!)
  const snapshot = useBlockSnapshot()
  const dataAssetId = block.content?.dataAssetId

  const instructions = useMemo(
    () => ({
      openMenu: () => {
        questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
      },
      unLink: async () => {
        if (!dataAssetId) return
        const dataAssetBlock = await fetchBlock(dataAssetId)
        const newSqlBlock = createEmptyBlock({
          type: Editor.BlockType.SQL,
          storyId: block.storyId!,
          parentId: block.storyId!,
          content: { ...dataAssetBlock.content }
        })
        commit({
          transcation: createTranscation({
            operations: [
              ...insertBlocksAndMoveOperations({
                storyId: block.storyId!,
                blocksFragment: {
                  children: [newSqlBlock.id],
                  data: { [newSqlBlock.id]: newSqlBlock }
                },
                targetBlockId: block.storyId!,
                direction: 'child',
                snapshot,
                path: 'resources'
              }),
              { cmd: 'set', path: ['content', 'dataAssetId'], args: newSqlBlock.id, table: 'block', id: block.id }
            ]
          }),
          storyId: block.storyId!
        })
      }
    }),
    [block.id, block.storyId, commit, dataAssetId, fetchBlock, questionEditor, snapshot]
  )
  return instructions
}

const VisulizationInstructionsContext = React.createContext<ReturnType<
  typeof useVisulizationBlockInstructionsProvider
> | null>(null)

const useVisulizationBlockInstructions = () => {
  const context = useContext(VisulizationInstructionsContext)
  return context
}

const _VisualizationBlock: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const editor = useEditor<Editor.VisualizationBlock>()
  const { block } = props
  const commit = useCommit()
  const snapshot = useBlockSnapshot()
  const [measureRef, rect] = useMeasure<HTMLDivElement>()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const dataAssetId = block.content?.dataAssetId

  const instructions = useVisulizationBlockInstructionsProvider(block)

  useImperativeHandle(ref, () => instructions, [instructions])

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

    if (!dataAssetId) {
      const newSqlBlock = createEmptyBlock({
        type: Editor.BlockType.SQL,
        storyId: block.storyId!,
        parentId: block.storyId!
      })
      commit({
        transcation: createTranscation({
          operations: [
            ...insertBlocksAndMoveOperations({
              storyId: block.storyId!,
              blocksFragment: {
                children: [newSqlBlock.id],
                data: { [newSqlBlock.id]: newSqlBlock }
              },
              targetBlockId: block.storyId!,
              direction: 'child',
              snapshot,
              path: 'resources'
            }),
            { cmd: 'set', path: ['content', 'dataAssetId'], args: newSqlBlock.id, table: 'block', id: block.id }
          ]
        }),
        storyId: block.storyId!
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [hoveringHandlers, hovering] = useBindHovering()

  return (
    <VisulizationInstructionsContext.Provider value={instructions}>
      <div
        ref={(el) => {
          measureRef(el as unknown as HTMLDivElement)
          elementRef.current = el
        }}
        {...hoveringHandlers()}
        className={QuestionsBlockContainer}
      >
        <React.Suspense fallback={<></>}>
          {block.content?.dataAssetId && <QuestionBlockHeader block={block} />}
          <QuestionBlockButtons block={block} show={hovering} slim={rect.width < 260} />
        </React.Suspense>

        {dataAssetId === undefined ? (
          <BlockPlaceHolder loading={false} text="New Question" />
        ) : (
          <VisualizationBlockContent
            dataAssetId={dataAssetId}
            block={block}
            blockFormat={props.blockFormat}
            parentType={props.parentType}
          />
        )}
      </div>
    </VisulizationInstructionsContext.Provider>
  )
}

const _VisualizationBlockContent: React.FC<{
  dataAssetId: string
  block: Editor.VisualizationBlock
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}> = ({ dataAssetId, block, blockFormat, parentType }) => {
  const dataAssetBlock = useBlockSuspense<Editor.DataAssetBlock>(dataAssetId)
  const snapshotId = dataAssetBlock?.content?.snapshotId
  const commit = useCommit()
  const storyBlockResources = useRecoilValue(BlockResourcesAtom(block.storyId!))

  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(dataAssetBlock.id)

  useEffect(() => {
    if (dataAssetBlock.id && !snapshotId && dataAssetBlock.content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute(dataAssetBlock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visualization = block.content?.visualization

  const { readonly } = useBlockBehavior()
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (dataAssetId && !storyBlockResources?.includes(dataAssetId)) {
      commit({
        transcation: createTranscation({
          operations: [
            { cmd: 'listBefore', path: ['resources'], args: { id: dataAssetId }, table: 'block', id: block.storyId! }
          ]
        }),
        storyId: block.storyId!
      })
    }
  }, [block.storyId, commit, dataAssetId, storyBlockResources])

  return (
    <>
      <QuestionBlockStatus dataAssetBlock={dataAssetBlock} />
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
          <QuestionBlockBody snapshotId={snapshotId} visualization={visualization} />
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
  const { small } = useBlockBehavior()

  return (
    <AnimatePresence>
      {!small && show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={css`
            position: absolute;
            right: 0;
            z-index: 1;
            top: 0;
            margin: 10px;
            padding: 5px;
            background: rgba(51, 51, 51, 0.7);
            border-radius: 8px;
          `}
        >
          <TitleButtonsInner block={block} slim={slim} />
        </motion.div>
      )}
    </AnimatePresence>
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
  const dataAssetBlock = useBlockSuspense(block.content?.dataAssetId!)
  const isReference = dataAssetBlock.storyId !== block.storyId
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
            <Link to={`/story/${dataAssetBlock.storyId}`}>
              <IconCommonBackLink
                className={css`
                  margin-right: 5px;
                `}
              />
            </Link>
          </Tippy>
        )}
        {dataAssetBlock.type === Editor.BlockType.SnapshotBlock && (
          <IconCommonLock
            className={css`
              margin-right: 5px;
            `}
          />
        )}
        <Tippy
          content={<BlockTitle block={dataAssetBlock} />}
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
              <BlockTitle block={dataAssetBlock} />
            </DetectableOverflow>
          </div>
        </Tippy>
      </div>
    </>
  )
}

const QuestionBlockHeader = memo(_QuestionBlockHeader)

const QuestionBlockStatus: React.FC<{
  dataAssetBlock: Editor.DataAssetBlock
}> = ({ dataAssetBlock }) => {
  const mutatingCount = useSnapshotMutating(dataAssetBlock.id)

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
            dataAssetBlock.content?.error ? (
              <div
                className={css`
                  max-height: 100px;
                  overflow: auto;
                `}
              >
                {dataAssetBlock.content?.error}
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
            ) : dataAssetBlock.content?.error ? (
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
            <SnapshotUpdatedAt loading={loading} dataAssetBlock={dataAssetBlock} />
          </React.Suspense>
        </div>
      </div>
    </>
  )
}

export const SnapshotUpdatedAt: React.FC<{
  loading: boolean
  dataAssetBlock: Editor.DataAssetBlock
}> = ({ loading, dataAssetBlock }) => {
  const snapshot = useSnapshot(dataAssetBlock.content?.snapshotId)
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
        : snapshot?.createdAt ?? dataAssetBlock.content?.lastRunAt
        ? dayjs(dataAssetBlock.content?.lastRunAt ?? snapshot?.createdAt).fromNow()
        : ''}
    </>
  )
}

export const LazyRenderDiagram: React.FC<{ data?: Data; config: Config<Type> }> = ({ data, config }) => {
  const ref = useRef<HTMLDivElement>(null)

  // const chart = useChart(config?.type)
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
  hoverContent: ReactNode
  className?: string
  setIsActive: (active: boolean) => void
}> = ({ block, setIsActive, className, hoverContent }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null)
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.VisualizationBlock>()
  const { readonly } = useBlockBehavior()
  const dataAssetBlock = useBlockSuspense<Editor.DataAssetBlock>(block.content?.dataAssetId!)
  const canConvertDataAsset = !readonly && dataAssetBlock.storyId === block.storyId
  const getSnapshot = useGetSnapshot()
  const questionEditor = useQuestionEditor(block.storyId!)
  const { t } = useTranslation()
  const mutateSnapshot = useRefreshSnapshot()

  const operations = useMemo(() => {
    if (!open) return []
    return [
      {
        title: t`Refresh Query`,
        icon: <IconCommonRefresh color={ThemingVariables.colors.text[0]} />,
        action: () => {
          mutateSnapshot.execute(dataAssetBlock)
        }
      },
      {
        title: t`Visualization options`,
        icon: <IconVisualizationSetting color={ThemingVariables.colors.text[0]} />,
        action: () => {
          questionEditor.open({ mode: 'VIS', blockId: block.id, storyId: block.storyId! })
        }
      },
      {
        title: t`Edit SQL`,
        icon: <IconCommonSql color={ThemingVariables.colors.text[0]} />,
        action: () => {
          questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
        }
      },
      {
        title: 'Copy link',
        icon: <IconCommonLink color={ThemingVariables.colors.text[0]} />,
        action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
                `${window.location.protocol}//${window.location.host}/story/${block?.storyId}#${block.id}`
              )
            }
          })
          toast('Link copied')
        }
      },
      {
        title: 'Download as CSV',
        icon: <IconMenuDownload color={ThemingVariables.colors.text[0]} />,
        action: async () => {
          const snapshot = await getSnapshot({ snapshotId: dataAssetBlock?.content?.snapshotId })
          const snapshotData = snapshot?.data
          invariant(snapshotData, 'snapshotData is null')
          const csvString = snapshotToCSV(snapshotData)
          invariant(csvString, 'csvString is null')
          csvString && download(csvString, 'data.csv', 'text/csv')
        }
      },
      {
        title: 'Download as image',
        icon: <IconMenuDownload color={ThemingVariables.colors.text[0]} />,
        action: async () => {
          const elementSVG = getBlockImageById(block.id)
          if (elementSVG) {
            html2canvas(elementSVG!, {
              foreignObjectRendering: false
            }).then(function (canvas) {
              const dataUrl = canvas.toDataURL('image/png')
              download(dataUrl, 'image.png', 'image/png')
            })
          }
        }
      },
      {
        title: 'Copy SQL',
        icon: <IconCommonCopy color={ThemingVariables.colors.text[0]} />,
        action: () => {
          copy(dataAssetBlock.content?.sql ?? '')
        }
      },
      canConvertDataAsset &&
        dataAssetBlock.type === Editor.BlockType.SQL && {
          title: 'Freeze data',
          icon: <IconCommonLock color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.SnapshotBlock)
          }
        },
      canConvertDataAsset &&
        dataAssetBlock.type === Editor.BlockType.SnapshotBlock && {
          title: 'Unfreeze data',
          icon: <IconCommonUnlock color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.SQL)
          }
        },
      canConvertDataAsset &&
        dataAssetBlock.type === Editor.BlockType.Metric && {
          title: 'Remove from data assets',
          icon: <IconCommonTurn color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.SQL)
          }
        },
      canConvertDataAsset &&
        dataAssetBlock.type === Editor.BlockType.SQL && {
          title: 'Add to data assets',
          icon: <IconCommonMetrics color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.updateBlockProps?.(dataAssetBlock.id, ['type'], Editor.BlockType.Metric)
          }
        }
    ].filter((x) => !!x) as OperationInterface[]
  }, [t, canConvertDataAsset, dataAssetBlock, mutateSnapshot, questionEditor, block, getSnapshot, editor])

  const { isOpen, openMenu, getToggleButtonProps, getMenuProps, highlightedIndex, getItemProps, closeMenu } = useSelect(
    { items: operations }
  )

  useEffect(() => {
    setTimeout(() => {
      setIsActive(isOpen)
    }, 100)
  }, [isOpen, setIsActive])

  return (
    <div>
      <IconButton
        hoverContent={hoverContent}
        icon={IconCommonMore}
        color={ThemingVariables.colors.gray[5]}
        {...getToggleButtonProps({ ref: setReferenceElement })}
        className={cx(
          css`
            outline: none;
            outline: none;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            background: transparent;
          `,
          className
        )}
      />
      <div {...getMenuProps()}>
        <EditorPopover
          referenceElement={referenceElement}
          setOpen={(open) => {
            if (open) {
              openMenu()
            } else {
              closeMenu()
            }
          }}
          open={isOpen}
        >
          <div
            className={css`
              background: ${ThemingVariables.colors.gray[5]};
              box-shadow: ${ThemingVariables.boxShadows[0]};
              border-radius: 8px;
              padding: 8px;
              width: 260px;
              overflow: hidden;
              outline: none;
            `}
          >
            {operations.map((operation, index) => (
              <div key={`${operation.title}`} {...getItemProps({ item: operation, index })}>
                <MenuItem
                  title={operation.title}
                  icon={operation.icon}
                  onClick={operation.action}
                  isActive={highlightedIndex === index}
                />
              </div>
            ))}
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
          </div>
        </EditorPopover>
      </div>
    </div>
  )
}

const VisBlockRefereshButton: React.FC<{ block: Editor.VisualizationBlock }> = ({ block }) => {
  const { t } = useTranslation()
  const dataAssetBlock = useBlockSuspense(block.content!.dataAssetId!)
  const { readonly } = useBlockBehavior()
  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(dataAssetBlock.id)
  const loading = mutatingCount !== 0
  return !readonly && isExecuteableBlockType(dataAssetBlock.type) ? (
    <QuestionBlockIconButton>
      <RefreshButton
        color={ThemingVariables.colors.gray[5]}
        loading={loading}
        hoverContent={t`Refresh`}
        onClick={
          loading ? () => mutateSnapshot.cancel(dataAssetBlock.id) : () => mutateSnapshot.execute(dataAssetBlock)
        }
      />
    </QuestionBlockIconButton>
  ) : null
}

const TitleButtonsInner: React.FC<{
  block: Editor.VisualizationBlock
  slim: boolean
}> = ({ block, slim }) => {
  const { t } = useTranslation()
  const [isActive, setIsActive] = useState(false)
  const [isPresent, safeToRemove] = usePresence()
  const questionEditor = useQuestionEditor(block.storyId!)

  useEffect(() => {
    isActive === false && !isPresent && safeToRemove?.()
  }, [isActive, isPresent, safeToRemove])

  return (
    <div
      className={css`
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        > * + * {
          margin-left: 10px;
        }
      `}
    >
      {slim === false && (
        <>
          {block.content?.dataAssetId && <VisBlockRefereshButton block={block} />}
          <QuestionBlockIconButton>
            <IconButton
              hoverContent={t`Visualization options`}
              icon={IconVisualizationSetting}
              color={ThemingVariables.colors.gray[5]}
              onClick={() => questionEditor.open({ mode: 'VIS', blockId: block.id, storyId: block.storyId! })}
            />
          </QuestionBlockIconButton>
          <QuestionBlockIconButton>
            <IconButton
              hoverContent={t`Edit SQL`}
              icon={IconCommonSql}
              color={ThemingVariables.colors.gray[5]}
              onClick={() => questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })}
            />
          </QuestionBlockIconButton>
        </>
      )}
      {block.content?.dataAssetId && (
        <QuestionBlockIconButton>
          <MoreDropdownSelect hoverContent={t`More`} block={block} setIsActive={setIsActive} />
        </QuestionBlockIconButton>
      )}
    </div>
  )
}

const QuestionBlockIconButton = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  button {
    width: 30px;
    height: 30px;
    cursor: pointer;
    border-radius: 8px;
  }
  button:hover {
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
