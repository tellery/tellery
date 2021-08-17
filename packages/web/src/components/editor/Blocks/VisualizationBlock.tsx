import {
  IconCommonBackLink,
  IconCommonCopy,
  IconCommonError,
  IconCommonLink,
  IconCommonMetrics,
  IconCommonMore,
  IconCommonRefresh,
  IconCommonSql,
  IconCommonTurn,
  IconMenuDownload,
  IconMenuDuplicate,
  IconMiscNoResult,
  IconVisualizationSetting
} from '@app/assets/icons'
import IconButton from '@app/components/kit/IconButton'
import { MenuItem } from '@app/components/MenuItem'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { RefreshButton } from '@app/components/RefreshButton'
import { useQuestionEditor } from '@app/components/StoryQuestionsEditor'
import { Diagram } from '@app/components/v11n'
import { charts } from '@app/components/v11n/charts'
import { Config, Data, Type } from '@app/components/v11n/types'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useOnClickOutside, useOnScreen } from '@app/hooks'
import { useBlockSuspense, useGetSnapshot, useSnapshot, useUser } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useInterval } from '@app/hooks/useInterval'
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DEFAULT_TITLE, snapshotToCSV, TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx, keyframes } from '@emotion/css'
import Tippy from '@tippyjs/react'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import download from 'downloadjs'
import { useSelect } from 'downshift'
import { AnimatePresence, motion, usePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import React, { ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { BlockingUI } from '../BlockBase/BlockingUIBlock'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { EditorPopover } from '../EditorPopover'
import { createTranscation, insertBlocksAndMoveOperations, TellerySelectionType } from '../helpers'
import { getBlockImageById } from '../helpers/contentEditable'
import { useEditor, useLocalSelection } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import type { OperationInterface } from '../Popovers/BlockOperationPopover'
import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '../utils'
import { BlockComponent, isExecuteableBlockType, registerBlock } from './utils'

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

const _VisualizationBlock: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const editor = useEditor<Editor.VisualizationBlock>()
  const { block } = props
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [blockFocusing, setBlockFocusing] = useState(false)
  const questionEditor = useQuestionEditor()
  const commit = useCommit()
  const snapshot = useBlockSnapshot()
  const dataAssetId = block.content?.dataAssetId

  useImperativeHandle(
    ref,
    () => ({
      openMenu: () => {
        questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
      }
    }),
    [block.id, block.storyId, questionEditor]
  )

  useEffect(() => {
    if (!block.content) {
      // setIsPopoverOpen(true)
      editor?.setBlockValue?.(block.id, (draftBlock) => {
        draftBlock.content = { title: [] }
        draftBlock.format = {
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

  return (
    <div
      ref={elementRef}
      className={QuestionsBlockContainer}
      tabIndex={-1}
      onFocus={() => setBlockFocusing(true)}
      onBlur={() => setBlockFocusing(false)}
    >
      {dataAssetId === undefined ? (
        <BlockPlaceHolder loading={false} text="New Question" />
      ) : (
        <VisualizationBlockContent
          dataAssetId={dataAssetId}
          block={block}
          wrapperRef={elementRef}
          blockFocusing={blockFocusing}
          blockFormat={props.blockFormat}
          parentType={props.parentType}
        />
      )}
    </div>
  )
}

const VisualizationBlockContent: React.FC<{
  dataAssetId: string
  block: Editor.VisualizationBlock
  wrapperRef: React.MutableRefObject<HTMLDivElement | null>
  blockFocusing: boolean
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}> = ({ dataAssetId, block, blockFocusing, wrapperRef, blockFormat, parentType }) => {
  const dataAssetBlock = useBlockSuspense<Editor.DataAssetBlock>(dataAssetId)
  const snapshotId = dataAssetBlock?.content?.snapshotId
  const commit = useCommit()
  const storyBlock = useBlockSuspense(block.storyId!)
  const onClickOutSide = useCallback(() => {
    setTitleEditing(false)
  }, [])

  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(dataAssetBlock.id)

  useEffect(() => {
    if (dataAssetBlock.id && !snapshotId && dataAssetBlock.content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute(dataAssetBlock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visualization = block.content?.visualization

  useOnClickOutside(wrapperRef, onClickOutSide)
  const { readonly } = useBlockBehavior()
  const [titleEditing, setTitleEditing] = useState(false)
  const localSelection = useLocalSelection(block.id)
  const isInputFocusing = !!localSelection
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (dataAssetId && !storyBlock.resources?.includes(dataAssetId)) {
      commit({
        transcation: createTranscation({
          operations: [
            { cmd: 'listBefore', path: ['resources'], args: { id: dataAssetId }, table: 'block', id: storyBlock.id }
          ]
        }),
        storyId: block.storyId!
      })
    }
  }, [block.storyId, commit, dataAssetId, storyBlock.id, storyBlock.resources])

  const isReferenceDataAssetBlock = dataAssetBlock.storyId !== block.storyId

  return (
    <>
      <QuestionBlockButtons
        block={block}
        dataAssetBlock={dataAssetBlock}
        show={blockFocusing}
        dataAssetId={dataAssetId}
      />
      <QuestionBlockHeader
        setTitleEditing={setTitleEditing}
        isReference={isReferenceDataAssetBlock}
        readonly={isReferenceDataAssetBlock || titleEditing === false || readonly}
        titleEditing={titleEditing || isInputFocusing}
        dataAssetBlock={dataAssetBlock}
      />
      <QuestionBlockStatus dataAssetBlock={dataAssetBlock} />
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
        onClick={() => {
          setTitleEditing(false)
        }}
      >
        <React.Suspense fallback={<BlockingUI blocking />}>
          <QuestionBlockBody ref={contentRef} snapshotId={snapshotId} visualization={visualization} />
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

const VisualizationBlock = React.forwardRef(_VisualizationBlock) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

VisualizationBlock.meta = {
  isText: true,
  forwardRef: true,
  hasChildren: false,
  isQuestion: true,
  isResizeable: true,
  isExecuteable: true
}

registerBlock(Editor.BlockType.Visualization, VisualizationBlock)

export const QuestionBlockButtons: React.FC<{
  block: Editor.VisualizationBlock
  dataAssetBlock: Editor.DataAssetBlock
  show: boolean
  dataAssetId: string
}> = ({ block, show, dataAssetBlock }) => {
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
            background: #ffffff;
            box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.08),
              0px 4px 12px rgba(0, 0, 0, 0.16);
            border-radius: 8px;
            position: absolute;
            right: 0;
            z-index: 1;
            bottom: 100%;
            margin-bottom: 13px;
            padding: 5px;
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            > * + * {
              margin-left: 10px;
            }
            > * {
              cursor: pointer;
            }
            opacity: 1;
          `}
        >
          <TitleButtonsInner block={block} dataAssetBlock={dataAssetBlock} sql={dataAssetBlock.content?.sql ?? ''} />
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
        padding: 0 20px;
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

const QuestionBlockHeader: React.FC<{
  setTitleEditing: React.Dispatch<React.SetStateAction<boolean>>
  titleEditing: boolean
  isReference: boolean
  readonly: boolean
  dataAssetBlock: Editor.DataAssetBlock
}> = ({ setTitleEditing, titleEditing, dataAssetBlock, readonly, isReference }) => {
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
          <Link to={`/story/${dataAssetBlock.storyId}`}>
            <IconCommonBackLink
              className={css`
                margin-right: 5px;
              `}
            />
          </Link>
        )}
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
              block={dataAssetBlock}
              disableReferenceDropdown
              disableSlashCommand
              disableTextToolBar
              readonly={readonly}
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
  sql: string
  hoverContent: ReactNode
  className?: string
  dataAssetBlock: Editor.DataAssetBlock
  setIsActive: (active: boolean) => void
}> = ({ block, sql, setIsActive, className, hoverContent, dataAssetBlock }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null)
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.VisualizationBlock>()
  const { readonly } = useBlockBehavior()

  const canConvertDataAsset = !readonly && dataAssetBlock.storyId === block.storyId

  const getSnapshot = useGetSnapshot()

  const operations = useMemo(() => {
    return [
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
      !readonly && {
        title: 'Duplicate',
        icon: <IconMenuDuplicate color={ThemingVariables.colors.text[0]} />,
        action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.preventDefault()
          e.stopPropagation()
          const selection = editor?.getSelection()
          editor?.duplicateHandler(
            selection?.type === TellerySelectionType.Block ? selection.selectedBlocks : [block.id]
          )
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
          copy(sql)
        }
      },
      canConvertDataAsset &&
        dataAssetBlock.type !== Editor.BlockType.SnapshotBlock && {
          title: 'Convert to snapshot',
          icon: <IconCommonTurn color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.setBlockValue?.(dataAssetBlock.id, (draftBlock) => {
              draftBlock.type = Editor.BlockType.SnapshotBlock
            })
          }
        },
      canConvertDataAsset &&
        dataAssetBlock.type !== Editor.BlockType.SQL && {
          title: 'Convert to SQL',
          icon: <IconCommonTurn color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.setBlockValue?.(dataAssetBlock.id, (draftBlock) => {
              draftBlock.type = Editor.BlockType.SQL
            })
          }
        },
      canConvertDataAsset &&
        dataAssetBlock.type === Editor.BlockType.SQL && {
          title: 'Convert to metric',
          icon: <IconCommonMetrics color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.setBlockValue?.(dataAssetBlock.id, (draftBlock) => {
              draftBlock.type = Editor.BlockType.Metric
            })
          }
        }
    ].filter((x) => !!x) as OperationInterface[]
  }, [
    block,
    canConvertDataAsset,
    dataAssetBlock?.content?.snapshotId,
    dataAssetBlock.id,
    dataAssetBlock.type,
    editor,
    getSnapshot,
    readonly,
    sql
  ])

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
        color={ThemingVariables.colors.primary[1]}
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

const TitleButtonsInner: React.FC<{
  block: Editor.VisualizationBlock
  dataAssetBlock: Editor.DataAssetBlock
  sql: string
}> = ({ block, sql, dataAssetBlock }) => {
  const { readonly } = useBlockBehavior()
  const [isActive, setIsActive] = useState(false)
  const [isPresent, safeToRemove] = usePresence()
  const questionEditor = useQuestionEditor()
  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(dataAssetBlock.id)
  const loading = mutatingCount !== 0

  useEffect(() => {
    isActive === false && !isPresent && safeToRemove?.()
  }, [isActive, isPresent, safeToRemove])

  return (
    <>
      {!readonly && isExecuteableBlockType(dataAssetBlock.type) && (
        <RefreshButton
          color={ThemingVariables.colors.primary[1]}
          loading={loading}
          hoverContent="Refresh"
          className={QuestionBlockIconButton}
          onClick={
            loading ? () => mutateSnapshot.cancel(dataAssetBlock.id) : () => mutateSnapshot.execute(dataAssetBlock)
          }
        />
      )}
      <IconButton
        hoverContent="Visualization options"
        icon={IconVisualizationSetting}
        color={ThemingVariables.colors.primary[1]}
        className={QuestionBlockIconButton}
        onClick={() => questionEditor.open({ mode: 'VIS', blockId: block.id, storyId: block.storyId! })}
      />
      <IconButton
        hoverContent="Edit SQL"
        className={QuestionBlockIconButton}
        icon={IconCommonSql}
        color={ThemingVariables.colors.primary[1]}
        onClick={() => questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })}
      />
      <MoreDropdownSelect
        hoverContent="More"
        className={QuestionBlockIconButton}
        block={block}
        sql={sql}
        setIsActive={setIsActive}
        dataAssetBlock={dataAssetBlock}
      />
    </>
  )
}

const QuestionBlockIconButton = css`
  width: 30px;
  height: 30px;
`

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
