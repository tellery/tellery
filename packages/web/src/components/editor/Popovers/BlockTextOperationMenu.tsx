import { getStoriesByTitle } from '@app/api'
import {
  IconCommonArrowDropDown,
  IconCommonFormula,
  IconCommonLink,
  IconFontBold,
  IconFontCode,
  IconFontColor,
  IconFontItalic,
  IconFontStory,
  IconFontStrikethrough,
  IconFontUnderline,
  IconMenuBulletedList,
  IconMenuH1,
  IconMenuH2,
  IconMenuH3,
  IconMenuNumberList,
  IconMenuQuote,
  IconMenuText,
  IconMenuToDo,
  IconMenuToggleList
} from '@app/assets/icons'
import { getBlockElementContentEditbleById } from '@app/components/editor/helpers/contentEditable'
import { nativeSelection2Tellery, TellerySelectionType } from '@app/components/editor/helpers/tellerySelection'
import {
  addMark,
  applyTransformOnSplitedTokens,
  applyTransformOnTokens,
  extractEntitiesFromToken,
  mergeTokens,
  removeMark,
  splitToken,
  tokenPosition2SplitedTokenPosition
} from '@app/components/editor/helpers/tokenManipulation'
import { createTranscation } from '@app/context/editorTranscations'
import { useBlockSuspense } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useStoryResources } from '@app/hooks/useStoryResources'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story } from '@app/types'
import { blockIdGenerator, DEFAULT_TITLE, TelleryGlyph } from '@app/utils'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import { AnimatePresence, motion } from 'framer-motion'
import isHotkey from 'is-hotkey'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePopper } from 'react-popper'
import invariant from 'tiny-invariant'
import { isTextBlock } from '../Blocks/utils'
import { EditorPopover } from '../EditorPopover'
import { useEditor, useGetBlockTitleTextSnapshot } from '../hooks'
import { useVariable } from '../hooks/useVariable'

const MARK_TYPES = Object.values(Editor.InlineType)

export const BlockTextOperationMenu = (props: { currentBlockId: string | null }) => {
  const [open, setOpen] = useState(false)
  const { currentBlockId } = props
  const [range, setRange] = useState<null | Range>(null)
  const [selectionString, setSelectionString] = useState('')

  useEffect(() => {
    if (range === null) {
      setOpen(false)
    }
  }, [range, setOpen])

  useEffect(() => {
    const onMouseDown = () => {
      setRange(null)
      setOpen(false)
    }

    const onMouseUp = (e: MouseEvent | KeyboardEvent) => {
      setTimeout(() => {
        if ((e.target as HTMLElement).closest('.tellery-select-toolbar')) {
          const selection = document.getSelection()
          if (selection) {
            const selectionString = selection.toString()
            const range = selection.rangeCount > 0 && selection.getRangeAt(0).cloneRange()
            if (selectionString.length && range) {
              setRange(range)
              setOpen(true)
              setSelectionString(selectionString)
            } else {
              setRange(null)
              setOpen(false)
            }
          }
        }
        // selection change will trigger after mouse up was triggered, add this delay to prevent
      }, 100)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keyup', onMouseUp)

    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keyup', onMouseUp)
    }
  }, [])

  return (
    <AnimatePresence>
      {open && currentBlockId && (
        <BlockTextOperationMenuInner
          currentBlockId={currentBlockId}
          setOpen={setOpen}
          range={range}
          selectionString={selectionString}
        />
      )}
    </AnimatePresence>
  )
}

export const BlockTextOperationMenuInner = ({
  setOpen,
  range,
  currentBlockId,
  selectionString
}: {
  currentBlockId: string
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  range: Range | null
  selectionString: string
}) => {
  const editor = useEditor<Editor.BaseBlock>()
  const currentBlock = useBlockSuspense(currentBlockId)
  const [modalRef, setModalRef] = useState<HTMLDivElement | null>(null)
  const [inlineEditing, setInlineEditing] = useState(false)
  const workspace = useWorkspace()

  const tokenRange = useMemo(() => {
    if (range && currentBlock && isTextBlock(currentBlock.type)) {
      const selection = nativeSelection2Tellery(currentBlock)
      if (selection?.type !== TellerySelectionType.Inline) return
      const focus = selection?.focus
      const anchor = selection?.anchor
      const tokens = currentBlock?.content!.title
      if (!tokens || !focus || !anchor) return
      const start = tokenPosition2SplitedTokenPosition(tokens, anchor.nodeIndex, anchor?.offset) ?? 0
      const end = tokenPosition2SplitedTokenPosition(tokens, focus.nodeIndex, focus?.offset) ?? 0
      return { start, end }
    } else {
      setOpen(false)
      return null
    }
  }, [range, currentBlock, setOpen])

  const pop = usePopper(range, modalRef, {
    placement: 'top',
    modifiers: [
      {
        name: 'offset',
        enabled: true,
        options: {
          offset: [0, 10]
        }
      }
    ]
  })

  const selectedTokens = useMemo(
    () => splitToken(currentBlock?.content?.title).slice(tokenRange?.start, tokenRange?.end) || [],
    [currentBlock?.content?.title, tokenRange?.end, tokenRange?.start]
  )

  const markHandler = useCallback(
    (mark: Editor.InlineType, args: string[], unmark: boolean) => {
      if (!tokenRange || !currentBlock) {
        return
      }

      const transformedTokens = applyTransformOnTokens(
        currentBlock?.content?.title || [],
        tokenRange,
        (token: Editor.Token): Editor.Token => {
          const marks = token[1]
          if (unmark) {
            const uniqueMarks = removeMark(marks, mark)
            if (uniqueMarks) {
              return [token[0], uniqueMarks]
            } else {
              return [token[0]]
            }
          } else {
            // clear other marks if is Reference mark
            if (mark === Editor.InlineType.Reference) {
              const uniqueMarks = addMark([], mark, args)
              return [TelleryGlyph.BI_LINK, uniqueMarks]
            } else {
              const uniqueMarks = addMark(marks, mark, args)
              return [token[0], uniqueMarks]
            }
          }
        }
      )

      const element = getBlockElementContentEditbleById(currentBlock.id)
      element?.focus()

      // invariant(tellerySelection, 'selection state not exist')

      editor?.setBlockValue?.(currentBlock.id, (block) => {
        block!.content!.title = transformedTokens
      })
    },
    [currentBlock, editor, tokenRange]
  )

  const isMarked = useMemo(
    () => (markType: Editor.InlineType) =>
      selectedTokens.length &&
      selectedTokens.every((token) => {
        return token[1] && token[1].findIndex((mark) => mark[0] === markType) !== -1
      }),
    [selectedTokens]
  )

  const markdMap = useMemo(() => new Map(MARK_TYPES.map((markType) => [markType, isMarked(markType)])), [isMarked])

  const snapshot = useBlockSnapshot()
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const commit = useCommit()

  const toggleReference = useCallback(async () => {
    if (!tokenRange || !currentBlock) {
      return
    }
    if (markdMap.get(Editor.InlineType.Reference)) {
      const splitedTokens = splitToken(currentBlock?.content?.title || [])
      const transformedTokens = applyTransformOnSplitedTokens(
        splitedTokens,
        tokenRange,
        (token: Editor.Token): Editor.Token => {
          const marks = token[1]
          const entity = extractEntitiesFromToken(token)
          const uniqueMarks = removeMark(marks, Editor.InlineType.Reference)
          invariant(entity.reference, 'reference is null')
          const block = getBlockFromSnapshot(entity.reference[2] as string, snapshot)
          const tokenText = entity.reference ? getBlockTitle(block) ?? DEFAULT_TITLE : token[0]
          if (uniqueMarks) {
            return [tokenText, uniqueMarks]
          } else {
            return [tokenText]
          }
        }
      )
      const mergedTokens = mergeTokens(transformedTokens)
      editor?.setBlockValue?.(currentBlock.id, (block) => {
        block!.content!.title = mergedTokens
      })
    } else {
      const title = selectionString
      let story = (await getStoriesByTitle({ title, workspaceId: workspace.id }))?.[0]

      if (!story) {
        const id = blockIdGenerator()
        // TODO: use create block factory
        story = {
          id: id,
          alive: true,
          parentId: workspace.id,
          parentTable: Editor.BlockParentType.WORKSPACE,
          format: {},
          content: { title: [[title]] },
          children: [],
          type: Editor.BlockType.Story,
          storyId: id,
          version: 0
        } as unknown as Story

        // TODO: use a transcation
        await commit({
          storyId: currentBlock.storyId!,
          transcation: createTranscation({
            operations: [
              {
                cmd: 'set',
                id: id,
                path: [],
                table: 'block',
                args: story
              }
            ]
          })
        })
      }
      if (story) {
        const storyId = story.id
        const splitedTokens = splitToken(currentBlock?.content?.title || [])
        const transformedTokens = applyTransformOnSplitedTokens(splitedTokens, tokenRange, (): Editor.Token => {
          const uniqueMarks = addMark([], Editor.InlineType.Reference, ['s', storyId])
          return [TelleryGlyph.BI_LINK, uniqueMarks]
        })
        const mergedTokens = mergeTokens([
          ...transformedTokens.slice(0, tokenRange.start + 1),
          ...transformedTokens.slice(tokenRange.end)
        ])
        editor?.setBlockValue?.(currentBlock.id, (block) => {
          block!.content!.title = mergedTokens
        })
      }
    }
  }, [commit, currentBlock, editor, getBlockTitle, markdMap, selectionString, snapshot, tokenRange, workspace.id])

  const editFormula = useCallback(
    async (formula: string) => {
      if (!tokenRange || !currentBlock) {
        return
      }
      if (markdMap.get(Editor.InlineType.Formula)) {
        const splitedTokens = splitToken(currentBlock?.content?.title || [])
        const transformedTokens = applyTransformOnSplitedTokens(
          splitedTokens,
          tokenRange,
          (token: Editor.Token): Editor.Token => {
            const marks = token[1]
            const entity = extractEntitiesFromToken(token)
            const uniqueMarks = removeMark(marks, Editor.InlineType.Formula)
            invariant(entity.fomula, 'reference is null')
            const tokenText = entity.fomula[1] as string
            if (uniqueMarks) {
              return [tokenText, uniqueMarks]
            } else {
              return [tokenText]
            }
          }
        )
        const mergedTokens = mergeTokens(transformedTokens)
        editor?.setBlockValue?.(currentBlock.id, (block) => {
          block!.content!.title = mergedTokens
        })
      } else {
        const splitedTokens = splitToken(currentBlock?.content?.title || [])
        const transformedTokens = applyTransformOnSplitedTokens(splitedTokens, tokenRange, (): Editor.Token => {
          const uniqueMarks = addMark([], Editor.InlineType.Formula, [formula])
          return [TelleryGlyph.EQUATION, uniqueMarks]
        })
        const mergedTokens = mergeTokens([
          ...transformedTokens.slice(0, tokenRange.start + 1),
          ...transformedTokens.slice(tokenRange.end)
        ])
        editor?.setBlockValue?.(currentBlock.id, (block) => {
          block!.content!.title = mergedTokens
        })
      }
    },
    [currentBlock, editor, markdMap, tokenRange]
  )

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!selectedTokens.length) {
        return
      }
      if (inlineEditing) {
        return
      }
      const handlers = [
        {
          hotkeys: ['mod+b'],
          handler: () => markHandler(Editor.InlineType.Bold, [], !!markdMap.get(Editor.InlineType.Bold))
        },
        {
          hotkeys: ['mod+i'],
          handler: () => markHandler(Editor.InlineType.Italic, [], !!markdMap.get(Editor.InlineType.Italic))
        },
        {
          hotkeys: ['mod+u'],
          handler: () => markHandler(Editor.InlineType.Underline, [], !!markdMap.get(Editor.InlineType.Underline))
        },
        {
          hotkeys: ['mod+e'],
          handler: () => markHandler(Editor.InlineType.Code, [], !!markdMap.get(Editor.InlineType.Code))
        },
        {
          hotkeys: ['mod+y'],
          handler: () => markHandler(Editor.InlineType.Strike, [], !!markdMap.get(Editor.InlineType.Strike))
        },
        // {
        //   hotkeys: ['mod+r'],
        //   handler: (e) => {
        //     e.preventDefault()
        //     toggleReference()
        //   }
        // },
        {
          hotkeys: ['mod+h'],
          handler: () =>
            markHandler(Editor.InlineType.Hightlighted, ['orange'], !!markdMap.get(Editor.InlineType.Hightlighted))
        }
      ]

      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: true }, e))
      )
      if (matchingHandler) {
        e.preventDefault()
        matchingHandler?.handler()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [inlineEditing, markHandler, markdMap, selectedTokens, toggleReference])

  return (
    <div
      {...pop.attributes.popper}
      style={pop.styles.popper as React.CSSProperties}
      ref={setModalRef}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <motion.div
        initial={{ opacity: 0, transform: 'scale(0.8)' }}
        animate={{ opacity: 1, transform: 'scale(1)' }}
        exit={{ opacity: 0, transform: 'scale(0.8)' }}
        transition={{ duration: 0.15 }}
        className={css`
          z-index: 1040;
          outline: none;
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          display: inline-flex;
          overflow: hidden;
          align-items: stretch;
          height: 40px;
          user-select: none;
        `}
      >
        <ToggleTypeOperation
          // parentSafeToRemove={safeToRemove}
          toggleBlockType={(type: Editor.BlockType) => {
            if (!currentBlock?.id) return
            editor?.setBlockValue?.(currentBlock.id, (block) => {
              if (block) {
                block.type = type
              }
            })
            setOpen(false)
          }}
          currentType={currentBlock?.type}
        />
        <VerticalDivider />
        <AddLinkOperation setInlineEditing={setInlineEditing} markHandler={markHandler} referenceRange={range} />
        <VerticalDivider />
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Bold}
          hoverContent="Bold"
          onClick={() => markHandler(Editor.InlineType.Bold, [], !!markdMap.get(Editor.InlineType.Bold))}
          active={!!markdMap.get(Editor.InlineType.Bold)}
          icon={IconFontBold}
        />
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Italic}
          hoverContent="Italic"
          onClick={() => markHandler(Editor.InlineType.Italic, [], !!markdMap.get(Editor.InlineType.Italic))}
          active={!!markdMap.get(Editor.InlineType.Italic)}
          icon={IconFontItalic}
        />
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Underline}
          hoverContent="Underline"
          onClick={() => markHandler(Editor.InlineType.Underline, [], !!markdMap.get(Editor.InlineType.Underline))}
          active={!!markdMap.get(Editor.InlineType.Underline)}
          icon={IconFontUnderline}
        />
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Strike}
          hoverContent="Strike-through"
          onClick={() => markHandler(Editor.InlineType.Strike, [], !!markdMap.get(Editor.InlineType.Strike))}
          active={!!markdMap.get(Editor.InlineType.Strike)}
          icon={IconFontStrikethrough}
        />
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Code}
          hoverContent="Inline code"
          onClick={() => markHandler(Editor.InlineType.Code, [], !!markdMap.get(Editor.InlineType.Code))}
          active={!!markdMap.get(Editor.InlineType.Code)}
          icon={IconFontCode}
        />
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Reference}
          hoverContent="Reference story"
          onClick={toggleReference}
          active={!!markdMap.get(Editor.InlineType.Reference)}
          icon={IconFontStory}
        />
        <VerticalDivider />
        <InlineFormulaPopover
          setInlineEditing={setInlineEditing}
          editHandler={editFormula}
          referenceRange={range}
          storyId={currentBlock.storyId!}
        />
        {/* <InlineEquationPopover setInlineEditing={setInlineEditing} markHandler={markHandler} referenceRange={range} /> */}
        <OperationButtonWithHoverContent
          type={Editor.InlineType.Hightlighted}
          hoverContent="Highlight"
          onClick={() =>
            markHandler(Editor.InlineType.Hightlighted, [], !!markdMap.get(Editor.InlineType.Hightlighted))
          }
          active={!!markdMap.get(Editor.InlineType.Hightlighted)}
          icon={IconFontColor}
        />
      </motion.div>
    </div>
  )
}

const OperationButtonWithHoverContent: React.FC<{
  type: string
  hoverContent: ReactNode
  onClick: () => void
  icon: React.ForwardRefExoticComponent<React.SVGAttributes<SVGElement>>
  active: boolean
}> = ({ type, hoverContent, onClick, active, icon }) => {
  return (
    <>
      <Tippy key={type} content={hoverContent} hideOnClick={false} animation="fade" duration={150} arrow={false}>
        <OperationButton active={active} onClick={onClick}>
          {icon({ color: ThemingVariables.colors.text[0] })}
        </OperationButton>
      </Tippy>
    </>
  )
}

const VerticalDivider = styled.div`
  height: 100%;
  width: 1px;
  flex: 1 0;
  background-color: ${ThemingVariables.colors.gray[1]};
`

const TEXT_TYPES = [
  {
    type: Editor.BlockType.Text,
    text: 'Text',
    icon: <IconMenuText color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.Header,
    text: 'Heading 1',
    icon: <IconMenuH1 color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.SubHeader,
    text: 'Heading 2',
    icon: <IconMenuH2 color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.SubSubHeader,
    text: 'Heading 3',
    icon: <IconMenuH3 color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.BulletList,
    text: 'Bullet List',
    icon: <IconMenuBulletedList color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.NumberedList,
    text: 'Numbered List',
    icon: <IconMenuNumberList color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.Quote,
    text: 'Quote',
    icon: <IconMenuQuote color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.Todo,
    text: 'Todo',
    icon: <IconMenuToDo color={ThemingVariables.colors.text[0]} />
  },
  {
    type: Editor.BlockType.Toggle,
    text: 'Toggle',
    icon: <IconMenuToggleList color={ThemingVariables.colors.text[0]} />
  }
]

const ToggleTypeOperation = (props: {
  toggleBlockType: (type: Editor.BlockType) => void
  currentType?: Editor.BlockType
}) => {
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)

  const [open, setOpen] = useState(false)
  const currentTypeText = TEXT_TYPES.find((type) => type.type === props.currentType)?.text
  const toggleBlockTypeHandler = useCallback(
    (type: Editor.BlockType) => {
      props.toggleBlockType(type)
      setOpen(false)
    },
    [props]
  )

  return (
    <>
      <div
        ref={setReferenceElement}
        className={css`
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          :hover {
            background-color: ${ThemingVariables.colors.primary[4]};
          }
          font-style: normal;
          font-weight: normal;
          font-size: 14px;
          line-height: 17px;
          color: ${ThemingVariables.colors.text[0]};
        `}
        onClick={() => {
          setOpen(true)
        }}
      >
        {currentTypeText}
        <IconCommonArrowDropDown color={ThemingVariables.colors.gray[0]} />
      </div>
      <EditorPopover referenceElement={referenceElement} open={open} setOpen={setOpen} disableClickThrough>
        <div
          className={css`
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
            overflow: hidden;
          `}
        >
          {TEXT_TYPES.map((type) => {
            return (
              <div
                key={type.type}
                className={css`
                  padding: 10px;
                  font-style: normal;
                  font-weight: normal;
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[0]};
                  :hover {
                    background-color: ${ThemingVariables.colors.primary[4]};
                  }
                  user-select: none;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                `}
                onClick={() => {
                  toggleBlockTypeHandler(type.type)
                }}
              >
                {type.icon}
                <span
                  className={css`
                    margin-left: 8px;
                  `}
                >
                  {type.text}
                </span>
              </div>
            )
          })}
        </div>
      </EditorPopover>
    </>
  )
}

const AddLinkOperation = (props: {
  markHandler: (type: Editor.InlineType, links: string[], isFirstLink: boolean) => void
  setInlineEditing: (editing: boolean) => void
  referenceRange: Range | null
}) => {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const editor = useEditor()

  useEffect(() => {
    if (!open) {
      props.setInlineEditing(false)
    } else {
      inputRef.current?.focus()
    }
  }, [open, props])

  return (
    <>
      <div
        className={css`
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          :hover {
            background-color: ${ThemingVariables.colors.primary[4]};
          }
          font-style: normal;
          font-weight: normal;
          font-size: 14px;
          line-height: 17px;
          color: ${ThemingVariables.colors.text[0]};
        `}
        onClick={() => {
          setOpen(true)
          props.setInlineEditing(true)
        }}
      >
        <IconCommonLink
          color={ThemingVariables.colors.text[0]}
          className={css`
            margin-right: 3px;
          `}
        />
        Link
        <IconCommonArrowDropDown color={ThemingVariables.colors.gray[0]} />
      </div>
      <EditorPopover referenceElement={props.referenceRange} open={open} setOpen={setOpen} disableClickThrough>
        <div
          className={css`
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
            overflow: hidden;
            user-select: none;
            padding: 10px 10px;
          `}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div
            className={css`
              font-size: 14px;
              color: ${ThemingVariables.colors.gray[1]};
              background: ${ThemingVariables.colors.gray[5]};
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              box-sizing: border-box;
              font-size: 14px;
              line-height: 17px;
              color: ${ThemingVariables.colors.text[1]};
            `}
          >
            <input
              className={css`
                outline: none;
                border: none;
                padding: 10px 10px;
                user-select: none;
              `}
              onPaste={(e) => {
                e.stopPropagation()
              }}
              ref={inputRef}
              onSelect={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              placeholder="Link URL"
              onInput={(e) => {
                setLink(e.currentTarget.value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  props.markHandler(Editor.InlineType.Link, [link], link.length === 0)
                  props.setInlineEditing(false)
                  editor?.setSelectionState((state) => {
                    if (state?.type === TellerySelectionType.Inline) {
                      return {
                        ...state,
                        anchor: state.focus
                      }
                    }
                    return state
                  })
                  setOpen(false)
                }
              }}
            ></input>
          </div>
        </div>
      </EditorPopover>
    </>
  )
}

const InlineEquationPopover = (props: {
  markHandler: (type: Editor.InlineType, links: string[], isFirstLink: boolean) => void
  setInlineEditing: (editing: boolean) => void
  referenceRange: Range | null
}) => {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const editor = useEditor()

  useEffect(() => {
    if (!open) {
      props.setInlineEditing(false)
    } else {
      inputRef.current?.focus()
    }
  }, [open, props])

  return (
    <>
      <OperationButtonWithHoverContent
        active={false}
        icon={IconFontCode}
        hoverContent="Inline equation"
        type={Editor.InlineType.Equation}
        onClick={() => {
          setOpen(true)
          props.setInlineEditing(true)
        }}
      />
      <EditorPopover referenceElement={props.referenceRange} open={open} setOpen={setOpen} disableClickThrough>
        <div
          className={css`
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
            overflow: hidden;
            user-select: none;
            padding: 10px 10px;
          `}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div
            className={css`
              font-size: 14px;
              color: ${ThemingVariables.colors.gray[1]};
              background: ${ThemingVariables.colors.gray[5]};
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              box-sizing: border-box;
              font-size: 14px;
              line-height: 17px;
              color: ${ThemingVariables.colors.text[1]};
            `}
          >
            <input
              className={css`
                outline: none;
                border: none;
                padding: 10px 10px;
                user-select: none;
              `}
              onPaste={(e) => {
                e.stopPropagation()
              }}
              ref={inputRef}
              onSelect={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              placeholder="Input an equation"
              onInput={(e) => {
                setLink(e.currentTarget.value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  props.markHandler(Editor.InlineType.Equation, [link], link.length === 0)
                  props.setInlineEditing(false)
                  editor?.setSelectionState((state) => {
                    if (state?.type === TellerySelectionType.Inline) {
                      return {
                        ...state,
                        anchor: state.focus
                      }
                    }
                    return state
                  })
                  setOpen(false)
                }
              }}
            ></input>
          </div>
        </div>
      </EditorPopover>
    </>
  )
}

const FormulaResultRenderer: React.FC<{ storyId: string; formula: string }> = ({ storyId, formula }) => {
  const variableValue = useVariable(storyId, formula)
  if (typeof variableValue === 'number') {
    return <>{variableValue}</>
  } else if (typeof variableValue === 'string') {
    return <>{variableValue}</>
  } else {
    return <>{JSON.stringify(variableValue)}</>
  }
}

const InlineFormulaInput: React.FC<{
  storyId: string
  editHandler: (formula: string) => void
  setOpen: (open: boolean) => void
}> = ({ storyId, editHandler, setOpen }) => {
  const currentResources = useStoryResources(storyId)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [formula, setFormula] = useState('')
  const editor = useEditor()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  return (
    <>
      <div
        className={css`
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          overflow: hidden;
          user-select: none;
          padding: 10px 10px;
          color: ${ThemingVariables.colors.text[1]};
        `}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div
          className={css`
            font-size: 14px;
            color: ${ThemingVariables.colors.gray[1]};
            background: ${ThemingVariables.colors.gray[5]};
            box-sizing: border-box;
            font-size: 14px;
            line-height: 17px;
            color: ${ThemingVariables.colors.text[1]};
            width: 420px;
          `}
        >
          <textarea
            className={css`
              outline: none;
              border: none;
              padding: 10px 10px;
              user-select: none;
              resize: none;
              min-height: 50px;
              width: 100%;
            `}
            onPaste={(e) => {
              e.stopPropagation()
            }}
            ref={inputRef}
            onSelect={(e) => {
              // e.preventDefault()
              e.stopPropagation()
            }}
            placeholder="Input an formula"
            onInput={(e) => {
              setFormula(e.currentTarget.value)
              // setLink(e.currentTarget.value)
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                editHandler(formula)
                editor?.setSelectionState((state) => {
                  if (state?.type === TellerySelectionType.Inline) {
                    return {
                      ...state,
                      anchor: state.focus
                    }
                  }
                  return state
                })
                setOpen(false)
              }
            }}
          ></textarea>
          <div
            className={css`
              background-color: ${ThemingVariables.colors.primary[5]};
              padding: 10px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              width: 100%;
            `}
          >
            =
            <React.Suspense fallback={<div></div>}>
              <FormulaResultRenderer storyId={storyId} formula={formula} />
            </React.Suspense>
          </div>
        </div>
        <div
          className={css`
            margin-top: 12px;
            > * + * {
              margin-top: 5px;
            }
            max-height: 200px;
            overflow-y: auto;
          `}
        >
          <div
            className={css`
              font-size: 12px;
              color: ${ThemingVariables.colors.text[2]};
            `}
          >
            Data Assets
          </div>
          {currentResources.map((resource) => (
            <div
              key={resource.id}
              className={css`
                cursor: pointer;
                padding: 5px;
                :hover {
                  background-color: ${ThemingVariables.colors.primary[4]};
                }
              `}
              onClick={(e) => {
                e.preventDefault()
                document.execCommand('insertText', false, `{{${resource.id}}}[1,1]`)
              }}
            >
              {getBlockTitle(resource)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

const InlineFormulaPopover = (props: {
  setInlineEditing: (editing: boolean) => void
  referenceRange: Range | null
  editHandler: (formula: string) => void
  storyId: string
}) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      props.setInlineEditing(false)
    }
  }, [open, props])
  return (
    <>
      <OperationButtonWithHoverContent
        active={false}
        icon={IconCommonFormula}
        hoverContent="Inline formula"
        type={Editor.InlineType.Variable}
        onClick={() => {
          setOpen(true)
          props.setInlineEditing(true)
        }}
      />
      <EditorPopover referenceElement={props.referenceRange} open={open} setOpen={setOpen} disableClickThrough>
        <InlineFormulaInput storyId={props.storyId} editHandler={props.editHandler} setOpen={setOpen} />
      </EditorPopover>
    </>
  )
}

const OperationButton = styled.div<{ active?: boolean | 0 }>`
  :hover {
    background-color: ${ThemingVariables.colors.primary[4]};
  }
  flex: none;
  order: 0;
  margin: 5px;
  display: inline-flex;
  align-items: center;
  width: 30px;
  justify-content: center;
  border-radius: 8px;
  background-color: ${(props) => (props.active ? ThemingVariables.colors.primary[4] : ThemingVariables.colors.gray[5])};
  color: ${(props) => (props.active ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[1])};
  cursor: pointer;
  user-select: none;
  text-align: center;
`
