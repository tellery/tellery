import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { Diagram } from '@app/components/v11n'
import { css, cx } from '@emotion/css'
import {
  IconCommonCopy,
  IconCommonMore,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { ThemingVariables } from 'styles'
import type { Editor, Snapshot } from 'types'
import { DEFAULT_TITLE, snapshotToCSV } from 'utils'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { BlockResizer } from '../BlockBase/BlockResizer'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { DebouncedResizeBlock } from '../DebouncedResizeBlock'
import { EditorPopover } from '../EditorPopover'
import { getBlockImageById } from '../helpers/contentEditable'
import { useEditor } from '../hooks'
import type { BlockFormatInterface } from '../hooks/useBlockFormat'
import type { OperationInterface } from '../Popovers/BlockOperationPopover'
import { IsBlockHovering } from '../store'
import { TelleryBlockSelectionAtom } from '../store/selection'

export const DEFAULT_QUESTION_BLOCK_ASPECT_RATIO = 16 / 9
export const DEFAULT_QUESTION_BLOCK_WIDTH = 0.7

const FOOTER_HEIGHT = 56

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
  const localSelection = useRecoilValue(TelleryBlockSelectionAtom(block.id))
  const isFocusing = !!localSelection

  useEffect(() => {
    editor?.registerOrUnregisterBlockInstance(block.id, {
      openMenu: () => {
        questionEditor.open({ mode: 'SQL', readonly, blockId: block.id, storyId: block.storyId! })
        // setIsPopoverOpen(true)
      },
      afterDuplicate: () => {
        questionEditor.open({ mode: 'SQL', readonly, blockId: block.id, storyId: block.storyId! })
      }
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

  return (
    <motion.div ref={ref} className={QuestionsBlockContainer}>
      {isEmptyBlock ? (
        <BlockPlaceHolder
          onClick={() => {
            // setIsPopoverOpen(true)
          }}
          loading={false}
          text="New Question"
        />
      ) : (
        originalBlock && (
          <>
            <QuestionBlockHeader
              setTitleEditing={setTitleEditing}
              titleEditing={titleEditing || isFocusing}
              block={block}
            />
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
                min-width: 100px;
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
            <QuestionBlockFooter snapshotId={snapshotId} block={block} originalBlock={originalBlock} />
          </>
        )
      )}
      {/* 
      {!readonly && ref.current && (
        <NewQuestionPopover
          open={isPopoverOpen}
          setOpen={setIsPopoverOpen}
          block={block}
          referneceElement={ref.current}
        />
      )} */}
    </motion.div>
  )
}

const _QuestionBlockBody: React.ForwardRefRenderFunction<
  HTMLDivElement | null,
  { snapshotId?: string; visualization?: Config<Type> }
> = ({ snapshotId, visualization }, ref) => {
  const { data: snapshot, isFetched: isSnapshotFetched, isIdle: isSnapshotIdle } = useSnapshot(snapshotId)

  const visualizationConfig = useMemo(() => {
    // ensure snapshot data is valid
    if (snapshot?.data && typeof snapshot?.data === 'object' && !snapshot.data.errMsg) {
      return visualization || charts[Type.TABLE].initializeConfig(snapshot.data, {})
    } else {
      return undefined
    }
  }, [snapshot, visualization])

  return (
    <BlockingUI blocking={isSnapshotIdle === false && isSnapshotFetched === false}>
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
          height: 60px;
          padding: 20px;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            flex: 1;
            padding: 5px 5px;
          `}
        >
          <div
            className={cx(
              css`
                font-style: normal;
                font-weight: 500;
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

const QuestionBlockFooter: React.FC<{
  block: Editor.QuestionBlock
  originalBlock: Editor.QuestionBlock
  snapshotId?: string
}> = ({ block, originalBlock, snapshotId }) => {
  const { data: snapshot } = useSnapshot(snapshotId)
  const mutateSnapshot = useRefreshSnapshot(originalBlock, block.id, block.storyId!)
  const mutatingCount = useSnapshotMutating(originalBlock.id)
  const [mutatingStartTimeStamp, setMutatingStartTimeStamp] = useState(0)
  const [nowTimeStamp, setNowTimeStamp] = useState(0)

  const loading = mutatingCount !== 0

  useEffect(() => {
    if (originalBlock.id === block.id && !snapshotId && originalBlock.content?.sql && mutatingCount === 0) {
      mutateSnapshot.execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) {
      setNowTimeStamp(Date.now())
      setMutatingStartTimeStamp(Date.now())
    }
  }, [loading])

  useInterval(
    () => {
      setNowTimeStamp(Date.now())
    },
    loading ? 1000 : null
  )

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-start;
          align-self: stretch;
          padding: 16px 20px 20px;
          height: ${FOOTER_HEIGHT}px;
          overflow: hidden;
        `}
      >
        <RefreshButton
          color={ThemingVariables.colors.primary[1]}
          loading={loading}
          onClick={loading ? mutateSnapshot.cancel : mutateSnapshot.execute}
        />
        <div
          className={css`
            width: 100%;
            flex-grow: 0;
            flex-shrink: 1;
            margin-left: 4px;
            overflow: hidden;
            align-items: center;
            font-weight: 600;
            font-size: 12px;
            color: ${ThemingVariables.colors.text[2]};
            white-space: nowrap;
            text-overflow: ellipsis;
          `}
        >
          {loading
            ? dayjs(nowTimeStamp).subtract(mutatingStartTimeStamp).format('mm:ss')
            : dayjs(snapshot?.createdAt).fromNow()}
        </div>

        <TitleButtons snapshot={snapshot} block={block} sql={originalBlock.content?.sql ?? ''} />
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
  setIsActive: (active: boolean) => void
}> = ({ snapshot, block, sql, setIsActive }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null)
  const { data: user } = useUser(block?.lastEditedById ?? null)

  const operations = useMemo(() => {
    return [
      {
        title: 'Download as CSV',
        icon: <Icon icon={IconMenuDownload} color={ThemingVariables.colors.text[0]} />,
        action: () => {
          const snapshotData = snapshot?.data
          if (snapshotData) {
            const csvString = snapshotToCSV(snapshotData)
            csvString && download(csvString, 'data.csv', 'text/csv')
          }
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
        icon={IconCommonMore}
        color={ThemingVariables.colors.gray[0]}
        {...getToggleButtonProps({ ref: setReferenceElement })}
        className={css`
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
        `}
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

const TitleButtons: React.FC<{
  snapshot: Snapshot | undefined
  block: Editor.Block
  sql: string
}> = ({ snapshot, block, sql }) => {
  const { small } = useBlockBehavior()
  const isHovering = useRecoilValue(IsBlockHovering(block.id))

  return (
    <AnimatePresence>
      {!small && isHovering && <TitleButtonsInner snapshot={snapshot} block={block} sql={sql} />}
    </AnimatePresence>
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

  useEffect(() => {
    isActive === false && !isPresent && safeToRemove?.()
  }, [isActive, isPresent, safeToRemove])

  return (
    <motion.div
      className={titleButtonsContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <IconButton
        icon={IconVisualizationSetting}
        onClick={() => questionEditor.open({ mode: 'VIS', readonly, blockId: block.id, storyId: block.storyId! })}
      />
      <IconButton
        icon={IconCommonSql}
        onClick={() => questionEditor.open({ mode: 'SQL', readonly, blockId: block.id, storyId: block.storyId! })}
      />
      <MoreDropdownSelect snapshot={snapshot} block={block} sql={sql} setIsActive={setIsActive} />
    </motion.div>
  )
}

const titleButtonsContainer = css`
  display: inline-flex;
  align-items: center;
  margin-left: 20px;
  flex-shrink: 0;
  > * + * {
    margin-left: 20px;
  }
  > * {
    cursor: pointer;
  }
  opacity: 1;
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
