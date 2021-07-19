import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { Diagram } from '@app/components/v11n'
import { css, cx, keyframes } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import {
  IconCommonCopy,
  IconCommonError,
  IconCommonMore,
  IconCommonRefresh,
  IconCommonSql,
  IconMenuDownload,
  IconMiscNoResult,
  IconVisualizationSetting
} from 'assets/icons'
import { BlockingUI } from 'components/editor/BlockBase/BlockingUIBlock'
import Icon from 'components/kit/Icon'
import IconButton from 'components/kit/IconButton'
import { MenuItem } from 'components/MenuItem'
import { RefreshButton } from 'components/RefreshButton'
import { useQuestionEditor } from 'components/StoryQuestionsEditor'
import { charts } from 'components/v11n/charts'
import { Config, Data, Type } from 'components/v11n/types'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import download from 'downloadjs'
import { useSelect } from 'downshift'
import { AnimatePresence, motion, usePresence } from 'framer-motion'
import { useOnClickOutside, useOnScreen } from 'hooks'
import { useBlockSuspense, useSnapshot, useUser } from 'hooks/api'
import { useInterval } from 'hooks/useInterval'
import { useRefreshSnapshot, useSnapshotMutating } from 'hooks/useStorySnapshotManager'
import html2canvas from 'html2canvas'
import invariant from 'invariant'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemingVariables } from 'styles'
import type { Editor, Snapshot, Story } from 'types'
import { DEFAULT_TITLE, snapshotToCSV } from 'utils'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { EditorPopover } from '../EditorPopover'
import { getBlockImageById } from '../helpers/contentEditable'
import { useEditor, useLocalSelection } from '../hooks'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import type { OperationInterface } from '../Popovers/BlockOperationPopover'
import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '../utils'

const FOOTER_HEIGHT = 20

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
`

export const QuestionBlock: React.FC<{
  block: Editor.QuestionBlock
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
}> = (props) => {
  const editor = useEditor<Editor.QuestionBlock>()
  const { block } = props
  const { readonly } = useBlockBehavior()

  const ref = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const originalBlock = useBlockSuspense<Editor.QuestionBlock>(block.id)
  const questionEditor = useQuestionEditor()
  const [titleEditing, setTitleEditing] = useState(false)
  const [blockFocusing, setBlockFocusing] = useState(false)
  const localSelection = useLocalSelection(block.id)
  const isInputFocusing = !!localSelection

  useEffect(() => {
    editor?.registerOrUnregisterBlockInstance(block.id, {
      openMenu: () => {
        questionEditor.open({ mode: 'SQL', readonly, blockId: block.id, storyId: block.storyId! })
        // setIsPopoverOpen(true)
      }
      // afterDuplicate: () => {
      //   questionEditor.open({ mode: 'SQL', readonly, blockId: block.id, storyId: block.storyId! })
      // }
    })
    return () => {
      editor?.registerOrUnregisterBlockInstance(block.id, undefined)
    }
  }, [block.id, block.storyId, editor, questionEditor, readonly])

  const onClickOutSide = useCallback(() => {
    setTitleEditing(false)
  }, [])

  useOnClickOutside(ref, onClickOutSide)

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
      ref={ref}
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

export const QuestionBlockButtons: React.FC<{ blockId: string; show: boolean }> = ({ blockId, show }) => {
  const block = useBlockSuspense<Editor.QuestionBlock>(blockId)
  const {
    data: snapshot,
    isFetched: isSnapshotFetched,
    isIdle: isSnapshotIdle
  } = useSnapshot(block?.content?.snapshotId)
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
          <TitleButtonsInner snapshot={snapshot} block={block} sql={block.content?.sql ?? ''} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const _QuestionBlockBody: React.ForwardRefRenderFunction<
  HTMLDivElement | null,
  { snapshotId?: string; visualization?: Config<Type> }
> = ({ snapshotId, visualization }, ref) => {
  const {
    data: snapshot,
    isFetched: isSnapshotFetched,
    isIdle: isSnapshotIdle,
    isPreviousData
  } = useSnapshot(snapshotId)

  const visualizationConfig = useMemo(() => {
    // ensure snapshot data is valid
    if (snapshot?.data && typeof snapshot?.data === 'object' && !snapshot.data.errMsg) {
      return visualization || charts[Type.TABLE].initializeConfig(snapshot.data, {})
    } else {
      return undefined
    }
  }, [snapshot, visualization])

  return (
    <BlockingUI blocking={isSnapshotIdle === false && isSnapshotFetched === false && isPreviousData === false}>
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
    </BlockingUI>
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
          height: 40px;
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
  const { data: snapshot } = useSnapshot(snapshotId)
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
              margin-right: 5px;
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
            : snapshot?.createdAt
            ? dayjs(snapshot?.createdAt).fromNow()
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
  snapshot?: Snapshot
  block: Editor.Block
  sql: string
  hoverContent: ReactNode
  className?: string
  setIsActive: (active: boolean) => void
}> = ({ snapshot, block, sql, setIsActive, className, hoverContent }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null)
  const { data: user } = useUser(block?.lastEditedById ?? null)

  const operations = useMemo(() => {
    return [
      {
        title: 'Download as CSV',
        icon: <Icon icon={IconMenuDownload} color={ThemingVariables.colors.text[0]} />,
        action: () => {
          const snapshotData = snapshot?.data
          invariant(snapshotData, 'snapshotData is null')
          const csvString = snapshotToCSV(snapshotData)
          invariant(csvString, 'csvString is null')
          csvString && download(csvString, 'data.csv', 'text/csv')
        }
      },
      {
        title: 'Download as Image',
        icon: <Icon icon={IconMenuDownload} color={ThemingVariables.colors.text[0]} />,
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
        icon: <Icon icon={IconCommonCopy} color={ThemingVariables.colors.text[0]} />,
        action: () => {
          copy(sql)
        }
      }
    ] as OperationInterface[]
  }, [block.id, snapshot?.data, sql])

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
        color={ThemingVariables.colors.primary[0]}
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
  snapshot: Snapshot | undefined
  block: Editor.Block
  sql: string
}> = ({ snapshot, block, sql }) => {
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
      <RefreshButton
        color={ThemingVariables.colors.primary[1]}
        loading={loading}
        hoverContent="Refresh"
        className={QuestionBlockIconButton}
        onClick={loading ? () => mutateSnapshot.cancel(block.id) : () => mutateSnapshot.execute(block)}
      />
      <IconButton
        hoverContent="Visualization options"
        icon={IconVisualizationSetting}
        className={QuestionBlockIconButton}
        onClick={() => questionEditor.open({ mode: 'VIS', readonly, blockId: block.id, storyId: block.storyId! })}
      />
      <IconButton
        hoverContent="Edit SQL"
        className={QuestionBlockIconButton}
        icon={IconCommonSql}
        onClick={() => questionEditor.open({ mode: 'SQL', readonly, blockId: block.id, storyId: block.storyId! })}
      />
      <MoreDropdownSelect
        hoverContent="More"
        className={QuestionBlockIconButton}
        snapshot={snapshot}
        block={block}
        sql={sql}
        setIsActive={setIsActive}
      />
    </>
  )
}

const StatusIndicator = styled.div<{ size: number; status: 'error' | 'loading' | 'success' }>`
  --status-indicator-color: ${(props) => {
    switch (props.status) {
      case 'error':
        return ThemingVariables.colors.negative[0]
      case 'loading':
        return ThemingVariables.colors.warning[0]
      case 'success':
        return ThemingVariables.colors.positive[0]
      default:
        return ThemingVariables.colors.positive[0]
    }
  }};
  @keyframes status-indicator-pulse {
    0% {
      box-shadow: 0 0 0 0 ${ThemingVariables.colors.warning[1]};
    }
    70% {
      box-shadow: 0 0 0 ${(props) => props.size}px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }

  display: ${(props) => (props.status === 'success' ? 'none' : 'inline-block')};
  border-radius: 50%;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  animation-name: ${(props) => (props.status === 'loading' ? 'status-indicator-pulse' : '')};
  animation-duration: 1.5s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: normal;
  animation-delay: 0;
  animation-fill-mode: none;
  margin-right: 10px;
  background-color: var(--status-indicator-color);
`

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
  }
`
