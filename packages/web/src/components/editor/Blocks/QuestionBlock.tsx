import {
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
import { BlockingUI } from '@app/components/editor/BlockBase/BlockingUIBlock'
import IconButton from '@app/components/kit/IconButton'
import { MenuItem } from '@app/components/MenuItem'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { RefreshButton } from '@app/components/RefreshButton'
import { useQuestionEditor } from '@app/components/StoryQuestionsEditor'
import { Diagram } from '@app/components/v11n'
import { charts } from '@app/components/v11n/charts'
import { Config, Data, Type } from '@app/components/v11n/types'
import { useOnClickOutside, useOnScreen } from '@app/hooks'
import { useBlockSuspense, useGetSnapshot, useSnapshot, useUser } from '@app/hooks/api'
import { useInterval } from '@app/hooks/useInterval'
import { useRefreshSnapshot, useSnapshotMutating } from '@app/hooks/useStorySnapshotManager'
import { ThemingVariables } from '@app/styles'
import { Editor, Snapshot } from '@app/types'
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
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { EditorPopover } from '../EditorPopover'
import { TellerySelectionType } from '../helpers'
import { getBlockImageById } from '../helpers/contentEditable'
import { useEditor, useLocalSelection } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import type { OperationInterface } from '../Popovers/BlockOperationPopover'
import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '../utils'
import { BlockComponent, registerBlock } from './utils'

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
  block: Editor.QuestionBlock
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}

const _QuestionBlock: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const editor = useEditor<Editor.QuestionBlock>()
  const { block } = props
  const { readonly } = useBlockBehavior()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const originalBlock = useBlockSuspense<Editor.QuestionBlock>(block.id)
  const questionEditor = useQuestionEditor()
  const [titleEditing, setTitleEditing] = useState(false)
  const [blockFocusing, setBlockFocusing] = useState(false)
  const localSelection = useLocalSelection(block.id)
  const isInputFocusing = !!localSelection

  useImperativeHandle(
    ref,
    () => ({
      openMenu: () => {
        questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
      }
    }),
    [block.id, block.storyId, questionEditor]
  )

  const onClickOutSide = useCallback(() => {
    setTitleEditing(false)
  }, [])

  useOnClickOutside(elementRef, onClickOutSide)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEmptyBlock = useMemo(() => {
    return block.content?.sql === undefined
  }, [block.content?.sql])

  const snapshotId = originalBlock?.content?.snapshotId
  const visualization = block.content?.visualization

  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(originalBlock.id)

  useEffect(() => {
    if (originalBlock.id === block.id && !snapshotId && originalBlock.content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute(originalBlock)
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
      {isEmptyBlock ? (
        <BlockPlaceHolder loading={false} text="New Question" />
      ) : (
        originalBlock && (
          <>
            <QuestionBlockHeader
              setTitleEditing={setTitleEditing}
              titleEditing={titleEditing || isInputFocusing}
              block={block}
            />
            <React.Suspense fallback={<div />}>
              <QuestionBlockStatus snapshotId={snapshotId} block={block} originalBlock={originalBlock} />
            </React.Suspense>
            <motion.div
              style={{
                paddingTop: props.blockFormat.paddingTop
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
                  blockFormat={props.blockFormat}
                  contentRef={contentRef}
                  parentType={props.parentType}
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
      )}
      <QuestionBlockButtons blockId={block.id} show={blockFocusing} />
      {/* 
      {!readonly && ref.current && (
        <NewQuestionPopover
          open={isPopoverOpen}
          setOpen={setIsPopoverOpen}
          block={block}
          referneceElement={ref.current}
        />
      )} */}
    </div>
  )
}

const _QuestionSnapshotBlock: React.ForwardRefRenderFunction<any, QuestionBlockProps> = (props, ref) => {
  const editor = useEditor<Editor.QuestionBlock>()
  const { block } = props
  const { readonly } = useBlockBehavior()
  const elementRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const originalBlock = useBlockSuspense<Editor.QuestionBlock>(block.id)
  const [titleEditing, setTitleEditing] = useState(false)
  const localSelection = useLocalSelection(block.id)
  const isInputFocusing = !!localSelection

  useImperativeHandle(
    ref,
    () => ({
      openMenu: () => {}
    }),
    []
  )

  const onClickOutSide = useCallback(() => {
    setTitleEditing(false)
  }, [])

  useOnClickOutside(elementRef, onClickOutSide)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEmptyBlock = useMemo(() => {
    return block.content?.sql === undefined
  }, [block.content?.sql])

  const snapshotId = originalBlock?.content?.snapshotId
  const visualization = block.content?.visualization

  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(originalBlock.id)

  useEffect(() => {
    if (originalBlock.id === block.id && !snapshotId && originalBlock.content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute(originalBlock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={elementRef} className={QuestionsBlockContainer} tabIndex={-1}>
      {isEmptyBlock ? (
        <BlockPlaceHolder loading={false} text="New Question" />
      ) : (
        originalBlock && (
          <>
            <QuestionBlockHeader
              setTitleEditing={setTitleEditing}
              titleEditing={titleEditing || isInputFocusing}
              block={block}
            />
            <QuestionBlockStatus snapshotId={snapshotId} block={block} originalBlock={originalBlock} />
            <motion.div
              style={{
                paddingTop: props.blockFormat.paddingTop
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
              <QuestionBlockBody ref={contentRef} snapshotId={snapshotId} visualization={visualization} />
              {readonly === false && (
                <BlockResizer
                  blockFormat={props.blockFormat}
                  contentRef={contentRef}
                  parentType={props.parentType}
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
      )}
    </div>
  )
}

const QuestionSnapshotBlock = React.forwardRef(_QuestionSnapshotBlock) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

QuestionSnapshotBlock.meta = {
  isText: true,
  forwardRef: true,
  hasChildren: false,
  isQuestion: true,
  isResizeable: true,
  isExecuteable: false
}
registerBlock(Editor.BlockType.QuestionSnapshot, QuestionSnapshotBlock)

const QuestionBlock = React.forwardRef(_QuestionBlock) as BlockComponent<
  React.ForwardRefExoticComponent<QuestionBlockProps & React.RefAttributes<any>>
>

QuestionBlock.meta = {
  isText: true,
  forwardRef: true,
  hasChildren: false,
  isQuestion: true,
  isResizeable: true,
  isExecuteable: true
}

registerBlock(Editor.BlockType.Question, QuestionBlock)
registerBlock(Editor.BlockType.Metric, QuestionBlock)

export const QuestionBlockButtons: React.FC<{ blockId: string; show: boolean }> = ({ blockId, show }) => {
  const block = useBlockSuspense<Editor.QuestionBlock>(blockId)
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
          <TitleButtonsInner block={block} sql={block.content?.sql ?? ''} />
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
      return visualization || charts[Type.TABLE].initializeConfig(snapshot.data, {})
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
  block: Editor.QuestionBlock
  titleEditing: boolean
}> = ({ setTitleEditing, block, titleEditing }) => {
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
              block={block}
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
  block: Editor.QuestionBlock
  originalBlock: Editor.QuestionBlock
  snapshotId?: string
}> = ({ block, originalBlock, snapshotId }) => {
  const snapshot = useSnapshot(snapshotId)
  const mutatingCount = useSnapshotMutating(originalBlock.id)
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
            block.content?.error ? (
              <div
                className={css`
                  max-height: 100px;
                  overflow: auto;
                `}
              >
                {block.content?.error}
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
            ) : block.content?.error ? (
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
            : snapshot?.createdAt || block.content?.lastRunAt
            ? dayjs(block.content?.lastRunAt ?? snapshot?.createdAt).fromNow()
            : ''}
        </div>
      </div>
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
  block: Editor.QuestionBlock
  sql: string
  hoverContent: ReactNode
  className?: string
  setIsActive: (active: boolean) => void
}> = ({ block, sql, setIsActive, className, hoverContent }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null)
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.QuestionBlock>()
  const { readonly } = useBlockBehavior()

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
          const snapshot = await getSnapshot({ snapshotId: block?.content?.snapshotId })
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
      !readonly &&
        block.type === Editor.BlockType.Question && {
          title: 'Convert to snapshot',
          icon: <IconCommonTurn color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.setBlockValue?.(block.id, (draftBlock) => {
              draftBlock.type = Editor.BlockType.QuestionSnapshot
            })
          }
        },
      !readonly &&
        block.type === Editor.BlockType.Question && {
          title: 'Convert to metric',
          icon: <IconCommonMetrics color={ThemingVariables.colors.text[0]} />,
          action: () => {
            editor?.setBlockValue?.(block.id, (draftBlock) => {
              draftBlock.type = Editor.BlockType.Metric
            })
          }
        }
    ].filter((x) => !!x) as OperationInterface[]
  }, [block, editor, getSnapshot, readonly, sql])

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
  block: Editor.Block
  sql: string
}> = ({ block, sql }) => {
  const { readonly } = useBlockBehavior()
  const [isActive, setIsActive] = useState(false)
  const [isPresent, safeToRemove] = usePresence()
  const questionEditor = useQuestionEditor()
  const mutateSnapshot = useRefreshSnapshot()
  const mutatingCount = useSnapshotMutating(block.id)
  const loading = mutatingCount !== 0

  useEffect(() => {
    isActive === false && !isPresent && safeToRemove?.()
  }, [isActive, isPresent, safeToRemove])

  return (
    <>
      {!readonly && (
        <RefreshButton
          color={ThemingVariables.colors.primary[1]}
          loading={loading}
          hoverContent="Refresh"
          className={QuestionBlockIconButton}
          onClick={loading ? () => mutateSnapshot.cancel(block.id) : () => mutateSnapshot.execute(block)}
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
