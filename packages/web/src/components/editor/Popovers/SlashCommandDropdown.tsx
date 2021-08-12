import {
  IconCommonLink,
  IconCommonQuestion,
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
import { useHover } from '@app/hooks'
import { useBlockSuspense } from '@app/hooks/api'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import debug from 'debug'
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import invariant from 'tiny-invariant'
import { mergeTokens, splitToken, tokenPosition2SplitedTokenPosition } from '..'
import { isQuestionLikeBlock, isVisualizationBlock } from '../Blocks/utils'
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
        if (range.getClientRects().length === 0) {
          return range.startContainer as HTMLElement
        } else {
          return range
        }
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

    editor?.setBlockValue?.(id, (block) => {
      logger('set block value')
      if (block.content?.title !== undefined) {
        block!.content!.title = mergedTokens
      }
    })
    return currentBlock
  }, [currentBlock, editor, id, selection])

  const createOrToggleBlock = useCallback(
    (blockType: Editor.BlockType) => (block: Editor.BaseBlock) => {
      invariant(editor, 'editor is null')
      let blockId = ''
      if (isEmptyTitleBlock(block)) {
        blockId = block.id
        editor.toggleBlockType(id, blockType, 0)
      } else {
        const newBlock = editor.insertNewEmptyBlock(blockType, id, 'bottom')
        blockId = newBlock.id
        editor?.setSelectionState({
          type: TellerySelectionType.Inline,
          storyId: newBlock.storyId!,
          anchor: { blockId, offset: 0, nodeIndex: 0 },
          focus: { blockId, offset: 0, nodeIndex: 0 }
        })
      }

      if (isVisualizationBlock(blockType)) {
        focusBlockHandler(blockId, block.storyId, true, false)
      }

      setOpen(false)
    },
    [editor, focusBlockHandler, id, setOpen]
  )

  const operations = useMemo(() => {
    return [
      // {
      //   title: 'Text',
      //   action: createOrToggleBlock(Editor.BlockType.Text),
      //   icon: <IconMenuText color={ThemingVariables.colors.text[0]} />
      // },
      {
        title: 'Question',
        action: createOrToggleBlock(Editor.BlockType.Visualization),
        icon: <IconCommonQuestion color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Heading 1',
        action: createOrToggleBlock(Editor.BlockType.Header),
        icon: <IconMenuH1 color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Heading 2',
        action: createOrToggleBlock(Editor.BlockType.SubHeader),
        icon: <IconMenuH2 color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Heading 3',
        action: createOrToggleBlock(Editor.BlockType.SubSubHeader),
        icon: <IconMenuH3 color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Checklist',
        action: createOrToggleBlock(Editor.BlockType.Todo),
        icon: <IconMenuToDo color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Bullet List',
        action: createOrToggleBlock(Editor.BlockType.BulletList),
        icon: <IconMenuBulletedList color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Numbered List',
        action: createOrToggleBlock(Editor.BlockType.NumberedList),
        icon: <IconMenuNumberList color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Toggle List',
        action: createOrToggleBlock(Editor.BlockType.Toggle),
        icon: <IconMenuToggleList color={ThemingVariables.colors.text[0]} />
      },
      // {
      //   title: 'Image',
      //   action: createOrToggleBlock(Editor.BlockType.Image),
      //   icon: <IconMenuImage color={ThemingVariables.colors.text[0]} />
      // },
      {
        title: 'Upload Image, Excel and CSV',
        action: createOrToggleBlock(Editor.BlockType.File),
        icon: <IconMenuUpload color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Code',
        action: createOrToggleBlock(Editor.BlockType.Code),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Quote',
        action: createOrToggleBlock(Editor.BlockType.Quote),
        icon: <IconMenuQuote color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Embed',
        action: createOrToggleBlock(Editor.BlockType.Embed),
        icon: <IconCommonLink color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Metabase (Beta)',
        action: createOrToggleBlock(Editor.BlockType.Metabase),
        icon: <IconCommonLink color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Line Divider',
        action: createOrToggleBlock(Editor.BlockType.Divider),
        icon: <IconMenuDivider color={ThemingVariables.colors.text[0]} />
      },
      {
        title: 'Block Equation (Beta)',
        action: createOrToggleBlock(Editor.BlockType.Equation),
        icon: <IconMenuCode color={ThemingVariables.colors.text[0]} />
      }
    ].filter((item) => item.title.toLowerCase().indexOf(keyword.toLowerCase()) !== -1)
  }, [createOrToggleBlock, keyword])

  useEffect(() => {
    if (operations.length === 0) {
      setOpen(false)
    }
  }, [operations, setOpen])

  const snapshot = useBlockSnapshot()
  const execSelectedOperation = useCallback(
    (index: number) => {
      removeBlockSlashCommandText()
      const block = getBlockFromSnapshot(id, snapshot)
      logger('getBlockFromSnapshot', block)
      operations[index].action(block)
    },
    [id, operations, removeBlockSlashCommandText, snapshot]
  )

  const [selectedResultIndex, setSelectedResultIndex] = useEditableContextMenu(
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
            active={selectedResultIndex === index}
            onClick={() => execSelectedOperation(index)}
            setIndex={setSelectedResultIndex}
          />
        )
      })}
    </div>
  )
}

const BlockMenuItem = (props: {
  icon?: ReactNode
  title: string
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  active?: boolean
  setIndex: (index: number) => void
  index: number
}) => {
  const [ref, hover] = useHover<HTMLDivElement>()
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
    if (hover) {
      props.setIndex(props.index)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, props.setIndex])

  return (
    <div
      ref={ref}
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
          /* &:hover {
            background: ${ThemingVariables.colors.primary[4]};
          } */
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
