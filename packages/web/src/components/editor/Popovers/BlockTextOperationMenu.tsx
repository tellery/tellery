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
import { FormButton } from '@app/components/kit/FormButton'
import { TippySingletonContextProvider } from '@app/components/TippySingletonContextProvider'
import { createTranscation } from '@app/context/editorTranscations'
import { useBlockSuspense } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useStoryResources } from '@app/hooks/useStoryResources'
import { useTippySingleton } from '@app/hooks/useTippySingleton'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { PopoverMotionVariants } from '@app/styles/animations'
import { Editor, Story } from '@app/types'
import { blockIdGenerator, DEFAULT_TITLE, TelleryGlyph } from '@app/utils'
import { css, cx } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import { AnimatePresence, motion } from 'framer-motion'
import isHotkey from 'is-hotkey'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePopper } from 'react-popper'
import TextareaAutosize from 'react-textarea-autosize'
import { useEvent } from 'react-use'
import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import invariant from 'tiny-invariant'
import { FormulaResultValueRenderer } from '../BlockBase/BlockRenderer'
import { isTextBlock } from '../Blocks/utils'
import { EditorPopover } from '../EditorPopover'
import { useEditor, useGetBlockTitleTextSnapshot } from '../hooks'
import { useInlineFormulaPopoverState } from '../hooks/useInlineFormulaPopoverState'
import { useStorySelection } from '../hooks/useStorySelection'
import { useVariable } from '../hooks/useVariable'
const MARK_TYPES = Object.values(Editor.InlineType)

const InlineEditingAtom = atom({ key: 'InlineEditingAtom', default: false })
const useInlineEditingState = () => {
  return useRecoilState(InlineEditingAtom)
}

const useInlineEditingValue = () => {
  return useRecoilValue(InlineEditingAtom)
}

const useSetInlineEditing = () => {
  return useSetRecoilState(InlineEditingAtom)
}

export const BlockTextOperationMenu = (props: { storyId: string }) => {
  const [open, setOpen] = useState(false)
  const [selectionState] = useStorySelection(props.storyId)
  const [range, setRange] = useState<Range | null>(null)
  const inlineEditing = useInlineEditingValue()

  useEvent(
    'selectionchange',
    useCallback(() => {
      if (inlineEditing === true) return
      const sel = document.getSelection()
      const _range = sel?.getRangeAt(0)
      _range && setRange(_range)
    }, [inlineEditing]),
    document
  )

  const currentBlockId = useMemo(() => {
    if (selectionState?.type === TellerySelectionType.Inline) {
      return selectionState.anchor.blockId
    }
    return null
  }, [selectionState])

  const selectionString = useMemo(() => {
    return range?.toString()
  }, [range])

  useEvent(
    'mouseup',
    useCallback(() => {
      if (selectionString?.length) {
        setOpen(true)
      } else {
        setOpen(false)
      }
    }, [selectionString?.length])
  )

  useEffect(() => {
    if (!selectionString?.length) {
      setOpen(false)
    }
  }, [selectionString?.length])

  return (
    <AnimatePresence>
      {open && range && currentBlockId && selectionString?.length && (
        <BlockTextOperationMenuInner
          currentBlockId={currentBlockId}
          setOpen={setOpen}
          range={range}
          selectionString={selectionString ?? ''}
        />
      )}
    </AnimatePresence>
  )
}

const BlockTextOperationMenuInner = ({
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
  const workspace = useWorkspace()
  const inlineEditing = useInlineEditingValue()

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
            if (uniqueMarks?.length) {
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
              console.log('add mark', [token[0], uniqueMarks])
              return [token[0], uniqueMarks]
            }
          }
        }
      )

      const element = getBlockElementContentEditbleById(currentBlock.id)
      element?.focus()

      // invariant(tellerySelection, 'selection state not exist')

      editor?.updateBlockTitle?.(currentBlock.id, transformedTokens)
    },
    [currentBlock, editor, tokenRange]
  )

  const getMarkValue = useCallback(
    (markType: Editor.InlineType) => {
      const isMarked =
        selectedTokens.length &&
        selectedTokens.every((token) => {
          return token[1] && token[1].findIndex((mark) => mark[0] === markType) !== -1
        })
      const firstToken = selectedTokens[0]
      if (isMarked) {
        const targetTokenType = firstToken?.[1]?.find((tokenType) => tokenType[0] === markType)
        if (!targetTokenType) {
          return undefined
        }
        return targetTokenType[1] ?? true
      } else {
        return undefined
      }
    },
    [selectedTokens]
  )

  const markdMap = useMemo(
    () => new Map(MARK_TYPES.map((markType) => [markType, getMarkValue(markType)])),
    [getMarkValue]
  )

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
      editor?.updateBlockTitle?.(currentBlock.id, mergedTokens)
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
        editor?.updateBlockTitle?.(currentBlock.id, mergedTokens)
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
        const transformedTokens = applyTransformOnSplitedTokens(splitedTokens, tokenRange, (): Editor.Token => {
          const uniqueMarks = addMark([], Editor.InlineType.Formula, [formula])
          return [TelleryGlyph.FORMULA, uniqueMarks]
        })
        const mergedTokens = mergeTokens(transformedTokens)
        editor?.updateBlockTitle?.(currentBlock.id, mergedTokens)
      } else {
        const splitedTokens = splitToken(currentBlock?.content?.title || [])
        const transformedTokens = applyTransformOnSplitedTokens(splitedTokens, tokenRange, (): Editor.Token => {
          const uniqueMarks = addMark([], Editor.InlineType.Formula, [formula])
          return [TelleryGlyph.FORMULA, uniqueMarks]
        })
        const mergedTokens = mergeTokens([
          ...transformedTokens.slice(0, tokenRange.start + 1),
          ...transformedTokens.slice(tokenRange.end)
        ])
        editor?.updateBlockTitle?.(currentBlock.id, mergedTokens)
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
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      className={css`
        z-index: 10;
      `}
    >
      <motion.div
        initial={'inactive'}
        animate={'active'}
        exit={'inactive'}
        variants={PopoverMotionVariants.fade}
        transition={{ duration: 0.15 }}
        className={css`
          outline: none;
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          display: inline-flex;
          overflow: hidden;
          align-items: stretch;
          height: 40px;
        `}
      >
        <TippySingletonContextProvider delay={500} arrow={false} placement="top">
          <ToggleTypeOperation
            toggleBlockType={(type: Editor.BlockType) => {
              if (!currentBlock?.id) return
              editor?.updateBlockProps?.(currentBlock.id, ['type'], type)
              setOpen(false)
            }}
            currentType={currentBlock?.type}
          />
          <VerticalDivider />
          <AddLinkOperation markHandler={markHandler} referenceRange={range} />
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
            editHandler={editFormula}
            referenceRange={range}
            storyId={currentBlock.storyId!}
            initValue={(markdMap.get(Editor.InlineType.Formula) as string) ?? selectionString ?? ''}
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
        </TippySingletonContextProvider>
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
  const tippySingleton = useTippySingleton()
  return (
    <>
      <Tippy
        key={type}
        singleton={tippySingleton as any}
        content={hoverContent}
        hideOnClick={false}
        animation="fade"
        duration={150}
        arrow={false}
      >
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
  referenceRange: Range | null
}) => {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const editor = useEditor()
  const setInlineEditing = useSetInlineEditing()

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open, props, setInlineEditing])

  const setOpenStatusHandler = useCallback(
    (status: boolean) => {
      setInlineEditing(status)
      setOpen(status)
    },
    [setInlineEditing]
  )

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
        onClick={() => setOpenStatusHandler(true)}
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
      <EditorPopover
        referenceElement={props.referenceRange}
        open={open}
        setOpen={setOpenStatusHandler}
        disableClickThrough
      >
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
                /* user-select: none; */
              `}
              onPaste={(e) => {
                e.stopPropagation()
              }}
              ref={inputRef}
              // onSelect={(e) => {
              //   e.preventDefault()
              //   e.stopPropagation()
              // }}
              placeholder="Link URL"
              onInput={(e) => {
                setLink(e.currentTarget.value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  props.markHandler(Editor.InlineType.Link, [link], link.length === 0)
                  editor?.setSelectionState((state) => {
                    if (state?.type === TellerySelectionType.Inline) {
                      return {
                        ...state,
                        anchor: state.focus
                      }
                    }
                    return state
                  })
                  setOpenStatusHandler(false)
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
  return <FormulaResultValueRenderer value={variableValue} />
}

const InlineFormulaInput: React.FC<{
  storyId: string
  editHandler: (formula: string) => void
  setOpen: (open: boolean) => void
  initValue: string
}> = ({ storyId, editHandler, setOpen, initValue = '' }) => {
  const currentResources = useStoryResources(storyId)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [formula, setFormula] = useState(initValue)
  const editor = useEditor()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = initValue
    }
  }, [initValue])

  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const submit = useCallback(() => {
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
  }, [editHandler, editor, formula, setOpen])

  return (
    <>
      <div
        className={cx(
          css`
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
            overflow: hidden;
            padding: 0 10px;
            color: ${ThemingVariables.colors.text[1]};
          `,
          'no-select'
        )}
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
            display: flex;
            flex-direction: column;
            padding-top: 10px;
          `}
        >
          <TextareaAutosize
            className={css`
              outline: none;
              border: none;
              padding: 10px 10px;
              user-select: all;
              resize: none;
              min-height: 50px;
              width: 100%;
            `}
            onPaste={(e) => {
              e.stopPropagation()
            }}
            ref={inputRef}
            placeholder="Input a formula"
            onInput={(e) => {
              setFormula(e.currentTarget.value)
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && e.shiftKey === false) {
                e.preventDefault()
                submit()
              }
            }}
          ></TextareaAutosize>
          <FormButton
            variant="primary"
            className={css`
              margin-left: auto;
              display: inline-flex;
              align-items: center;
              margin-right: 10px;
              margin-bottom: 10px;
            `}
            onClick={() => {
              submit()
            }}
          >
            Confirm
          </FormButton>
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
          `}
        >
          <div
            className={css`
              font-size: 12px;
              color: ${ThemingVariables.colors.text[2]};
            `}
          >
            Queries
          </div>
          <div
            className={css`
              overflow-y: auto;
              max-height: 200px;
              padding-bottom: 20px;
            `}
          >
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
                  // e.preventDefault()
                  document.execCommand('insertText', false, `{{${resource.id}}}[1,1]`)
                }}
              >
                {getBlockTitle(resource)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

const InlineFormulaPopover = (props: {
  referenceRange: Range | null
  editHandler: (formula: string) => void
  storyId: string
  initValue: string
}) => {
  const [open, setOpen] = useInlineFormulaPopoverState()
  const setInlineEditing = useSetInlineEditing()
  const editor = useEditor()

  const setOpenStatusHandler = useCallback(
    (status: boolean) => {
      setInlineEditing(status)
      setOpen(status)
      if (status === false) {
        editor?.setSelectionState((state) => {
          if (state?.type === TellerySelectionType.Inline) {
            return {
              ...state,
              anchor: state.focus
            }
          }
          return state
        })
      }
    },
    [editor, setInlineEditing, setOpen]
  )

  useEffect(() => {
    if (open) {
      setInlineEditing(true)
    }
  }, [open, setInlineEditing])

  return (
    <>
      <OperationButtonWithHoverContent
        active={false}
        icon={IconCommonFormula}
        hoverContent="Inline formula"
        type={Editor.InlineType.Variable}
        onClick={() => setOpenStatusHandler(true)}
      />
      <EditorPopover
        referenceElement={props.referenceRange}
        open={open}
        setOpen={setOpenStatusHandler}
        disableClickThrough
      >
        <InlineFormulaInput
          storyId={props.storyId}
          editHandler={props.editHandler}
          setOpen={setOpenStatusHandler}
          initValue={props.initValue}
        />
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
