import {
  IconCommonLink,
  IconCommonSqlQuery,
  IconMenuBulletedList,
  IconMenuCode,
  IconMenuDivider,
  IconMenuH1,
  IconMenuH2,
  IconMenuH3,
  IconMenuNumberList,
  IconMenuQuote,
  IconMenuToDo,
  IconMenuToggleList,
  IconMenuUpload
} from '@app/assets/icons'
import {
  createTranscation,
  insertBlocksAndMoveOperations,
  removeBlocksOperations
} from '@app/context/editorTranscations'
import { createEmptyBlock, DEFAULT_VISULIZATION_FORMAT } from '@app/helpers/blockFactory'
import { useBindHovering } from '@app/hooks'
import { useBlockSuspense } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useCommit } from '@app/hooks/useCommit'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { BlockFragment } from '@app/utils/dnd'
import { css, cx } from '@emotion/css'
import debug from 'debug'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import invariant from 'tiny-invariant'
import { mergeTokens, splitToken, tokenPosition2SplitedTokenPosition } from '..'
import { EditorPopover } from '../EditorPopover'
import { TellerySelection, tellerySelection2Native, TellerySelectionType } from '../helpers/tellerySelection'
import { useEditableContextMenu, useEditor } from '../hooks'

const logger = debug('tellery:slashCommand')

interface SlachCommandDropDown {
  open: boolean
  id: string
  keyword: string
  blockRef: React.MutableRefObject<HTMLDivElement | null>
  setOpen: (show: boolean) => void
  selection: TellerySelection | null
  referenceRange?: null | Range | HTMLElement
}

export const SlashCommandDropdown: React.FC<SlachCommandDropDown> = (props) => {
  const { id, keyword, open, setOpen, selection } = props
  const [referenceRange, setReferenceRange] = useState<null | Range | HTMLElement>(null)

  useEffect(() => {
    if (open) {
      invariant(selection, 'selection is null')
      invariant(selection.type === TellerySelectionType.Inline, 'selection type is not inline')
      setReferenceRange((_referenceRange) => {
        const range = tellerySelection2Native(selection)
        invariant(range, 'range is null')
        return range
        // if (range.getClientRects().length === 0) {
        //   return range.startContainer as HTMLElement
        // } else {
        //   return range
        // }
      })
    } else {
      setOpen(false)
      setReferenceRange(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setOpen])

  useEffect(() => {
    if (selection && selection.type === TellerySelectionType.Inline && open) {
      if (selection.focus.nodeIndex <= selection.anchor.nodeIndex && selection.focus.offset < selection.anchor.offset) {
        setOpen(false)
        setReferenceRange(null)
      }
    }
  }, [open, selection, setOpen])

  return (
    <EditorPopover
      open={open}
      setOpen={setOpen}
      referenceElement={referenceRange ?? null}
      placement="bottom-start"
      lockBodyScroll
    >
      {referenceRange && open && (
        <SlashCommandDropDownInner {...props} open={!!(referenceRange && open)} referenceRange={referenceRange} />
      )}
    </EditorPopover>
  )
}

const isEmptyTitleBlock = (block: Editor.BaseBlock) => {
  if (!block.content?.title) return true
  return block.content.title.length === 0
}

export const SlashCommandDropDownInner: React.FC<SlachCommandDropDown> = (props) => {
  const { id, keyword, setOpen, blockRef, referenceRange, selection, open } = props
  const editor = useEditor()
  // const [selectedResultIndex, setSelectedResultIndex] = useState(0)
  const currentBlock = useBlockSuspense(id)
  const focusBlockHandler = usePushFocusedBlockIdState()
  const blockTranscations = useBlockTranscations()
  const removeBlockSlashCommandText = useCallback(() => {
    invariant(selection && selection.type !== TellerySelectionType.Block, 'selection type is block')

    const tokens = currentBlock?.content?.title ?? []
    const splitedTokens = splitToken(tokens)
    const start = tokenPosition2SplitedTokenPosition(tokens, selection.anchor.nodeIndex, selection.anchor.offset) - 1
    const end = tokenPosition2SplitedTokenPosition(tokens, selection.focus.nodeIndex, selection.focus.offset)

    invariant(typeof start === 'number' || typeof end === 'number', 'start or end is not number')

    if (splitedTokens.length === 0 || splitedTokens[start]?.[0] !== '/') {
      return currentBlock
    }

    splitedTokens.splice(start, end - start)
    const mergedTokens = mergeTokens(splitedTokens)

    editor?.updateBlockTitle?.(id, mergedTokens)
    return { ...currentBlock, content: { ...currentBlock.content, title: mergedTokens } }
  }, [currentBlock, editor, id, selection])
  const commit = useCommit()

  const insertBlockFragment = useCallback(
    (blocksFragment: BlockFragment, block: Editor.Block) => {
      invariant(editor, 'editor is null')
      const operations = []
      operations.push(
        ...insertBlocksAndMoveOperations({
          storyId: block.storyId!,
          blocksFragment,
          targetBlock: block,
          direction: 'bottom',
          path: 'children'
        })
      )

      const leadingBlockId = blocksFragment.children[0]
      if (isEmptyTitleBlock(block)) {
        operations.push(...removeBlocksOperations([block], block.storyId!))
      }

      commit({ transcation: createTranscation({ operations }), storyId: block.storyId! })

      setTimeout(() => {
        editor?.setSelectionState({
          type: TellerySelectionType.Inline,
          storyId: block.storyId!,
          anchor: { blockId: leadingBlockId, offset: 0, nodeIndex: 0 },
          focus: { blockId: leadingBlockId, offset: 0, nodeIndex: 0 }
        })
      }, 0)
    },
    [commit, editor]
  )

  const createOrToggleBlock = useCallback(
    (options: Partial<Editor.Block>) => async (block: Editor.BaseBlock) => {
      invariant(editor, 'editor is null')
      const newBlock = createEmptyBlock({ ...options, parentId: block.parentId, storyId: block.storyId })
      const blockFragment = {
        children: [newBlock.id],
        data: {
          [newBlock.id]: newBlock
        }
      }
      insertBlockFragment(blockFragment, block)
      setOpen(false)
    },
    [editor, insertBlockFragment, setOpen]
  )

  const createOrToggleQueryBlock = useCallback(
    () => async (block: Editor.BaseBlock) => {
      invariant(editor, 'editor is null')
      const visBlock = createEmptyBlock<Editor.VisualizationBlock>({
        type: Editor.BlockType.Visualization,
        format: DEFAULT_VISULIZATION_FORMAT,
        storyId: block.storyId!,
        parentId: block.parentId
      })
      const queryBlock = createEmptyBlock<Editor.QueryBlock>({
        type: Editor.BlockType.SQL,
        storyId: block.storyId!,
        parentId: visBlock.id
      })
      queryBlock.parentId = visBlock.id
      visBlock.content = { ...visBlock.content, queryId: queryBlock.id }
      visBlock.children = [queryBlock.id]

      const blockFragment = {
        children: [visBlock.id],
        data: {
          [visBlock.id]: visBlock,
          [queryBlock.id]: queryBlock
        }
      }
      insertBlockFragment(blockFragment, block)

      focusBlockHandler(visBlock.id, block.storyId, true, false)

      setOpen(false)
    },
    [editor, focusBlockHandler, insertBlockFragment, setOpen]
  )

  const operations = useMemo(() => {
    return [
      // {
      //   title: 'Text',
      //   action: createOrToggleBlock(Editor.BlockType.Text),
      //   icon: <IconMenuText color={ThemingVariables.colors.text[0]} />
      // },
      {
        title: 'SQL Query',
        action: createOrToggleQueryBlock(),
        icon: <IconCommonSqlQuery color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Heading 1',
        action: createOrToggleBlock({ type: Editor.BlockType.Header }),
        icon: <IconMenuH1 color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Heading 2',
        action: createOrToggleBlock({ type: Editor.BlockType.SubHeader }),
        icon: <IconMenuH2 color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Heading 3',
        action: createOrToggleBlock({ type: Editor.BlockType.SubSubHeader }),
        icon: <IconMenuH3 color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Checklist',
        action: createOrToggleBlock({ type: Editor.BlockType.Todo }),
        icon: <IconMenuToDo color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Bullet List',
        action: createOrToggleBlock({ type: Editor.BlockType.BulletList }),
        icon: <IconMenuBulletedList color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Numbered List',
        action: createOrToggleBlock({ type: Editor.BlockType.NumberedList }),
        icon: <IconMenuNumberList color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Toggle List',
        action: createOrToggleBlock({ type: Editor.BlockType.Toggle }),
        icon: <IconMenuToggleList color={ThemingVariables.colors.text[0]} />
      },
      // {
      //   title: 'Image',
      //   action: createOrToggleBlock(Editor.BlockType.Image),
      //   icon: <IconMenuImage color={ThemingVariables.colors.text[0]} />
      // },
      {
        title: 'Upload Image, Excel and CSV',
        action: createOrToggleBlock({ type: Editor.BlockType.File }),
        icon: <IconMenuUpload color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Code',
        action: createOrToggleBlock({ type: Editor.BlockType.Code }),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Quote',
        action: createOrToggleBlock({ type: Editor.BlockType.Quote }),
        icon: <IconMenuQuote color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Embed',
        action: createOrToggleBlock({ type: Editor.BlockType.Embed }),
        icon: <IconCommonLink color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Metabase (Beta)',
        action: createOrToggleBlock({ type: Editor.BlockType.Metabase }),
        icon: <IconCommonLink color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Line Divider',
        action: createOrToggleBlock({ type: Editor.BlockType.Divider }),
        icon: <IconMenuDivider color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Block Equation (Beta)',
        action: createOrToggleBlock({ type: Editor.BlockType.Equation }),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Transclusion Input',
        action: createOrToggleBlock({
          type: Editor.BlockType.Control,
          content: { type: 'transclusion' } as any
        }),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Text Input',
        action: createOrToggleBlock({
          type: Editor.BlockType.Control,
          content: { type: 'text' } as any
        }),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Number Input (Decimal)',
        action: createOrToggleBlock({
          type: Editor.BlockType.Control,
          content: { type: 'number' } as any
        }),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Number Input (Float)',
        action: createOrToggleBlock({
          type: Editor.BlockType.Control,
          content: { type: 'float' } as any
        }),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      }
      // {
      //   title: 'Date Input',
      //   action: createOrToggleBlock({
      //     type: Editor.BlockType.Control,
      //     content: { type: 'date', name: '', defaultValue: '' }
      //   }),
      //   icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      // }
      // {
      //   title: 'Select Input',
      //   action: createOrToggleBlock({ type: Editor.BlockType.Control },content: { type: 'select' ,name:'',defaultValue:''}),
      //   icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      // }
    ].filter((item) => item.title.toLowerCase().indexOf(keyword.toLowerCase()) !== -1)
  }, [createOrToggleBlock, createOrToggleQueryBlock, keyword])

  useEffect(() => {
    if (operations.length === 0) {
      setOpen(false)
    }
  }, [operations, setOpen])

  const execSelectedOperation = useCallback(
    (index: number) => {
      const block = removeBlockSlashCommandText()
      logger('getBlockFromSnapshot', block)
      operations[index].action(block)
    },
    [operations, removeBlockSlashCommandText]
  )

  const [selectedResultIndex, setSelectedResultIndex, navigatingMode] = useEditableContextMenu(
    open,
    useMemo(
      () =>
        operations.map((item, index) => {
          return () => execSelectedOperation(index)
        }),
      [execSelectedOperation, operations]
    ),
    blockRef
  )

  return (
    <div
      className={css`
        background: ${ThemingVariables.colors.gray[5]};
        box-shadow: ${ThemingVariables.boxShadows[0]};
        border-radius: 8px;
        padding: 8px;
        width: 300px;
        max-height: ${44 * 7}px;
        overflow-y: auto;
        font-weight: normal;
      `}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {operations.map((operation, index) => {
        return (
          <BlockMenuItem
            key={operation.title}
            title={operation.title}
            icon={operation.icon}
            index={index}
            navigatingMode={navigatingMode}
            active={selectedResultIndex === index}
            onClick={() => execSelectedOperation(index)}
            setIndex={setSelectedResultIndex}
          />
        )
      })}
    </div>
  )
}

interface BlockMenuItemProps {
  icon?: ReactNode
  title: string
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  active?: boolean
  setIndex: (index: number) => void
  index: number
  navigatingMode: 'mouse' | 'keyboard'
}

const BlockMenuItem = (props: BlockMenuItemProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [hoveringHandlers, hover] = useBindHovering()

  useEffect(() => {
    if (props.active && ref.current) {
      scrollIntoView(ref.current, {
        scrollMode: 'always',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [props.active, ref])

  useEffect(() => {
    if (props.navigatingMode === 'mouse' && hover) {
      props.setIndex(props.index)
    }
  }, [hover, props, props.navigatingMode])

  return (
    <div
      ref={ref}
      {...hoveringHandlers()}
      className={cx(
        css`
          border-radius: 8px;
          height: 44px;
          width: 100%;
          padding: 4px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.1s ease;
          display: block;
          color: ${ThemingVariables.colors.text[0]};
          text-decoration: none;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          display: flex;
          align-items: center;
          &:active {
            background: ${ThemingVariables.colors.primary[3]};
          }
        `,
        props.active &&
          css`
            background: ${ThemingVariables.colors.primary[4]};
          `
      )}
      onClick={props.onClick}
    >
      {props.icon && (
        <div
          className={css`
            width: 36px;
            border: 1px solid ${ThemingVariables.colors.gray[1]};
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          {props.icon}
        </div>
      )}
      <div
        className={css`
          margin-left: 10px;
          line-height: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        <span
          className={css`
            color: ${ThemingVariables.colors.text[0]};
            font-size: 14px;
            line-height: 17px;
          `}
        >
          {props.title}
        </span>
      </div>
    </div>
  )
}
