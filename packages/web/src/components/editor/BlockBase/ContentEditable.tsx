import { deserialize, restoreRange, saveSelection } from '@app/components/editor/helpers/contentEditable'
import { LazyTippy } from '@app/components/LazyTippy'
import { useOpenStory, usePrevious } from '@app/hooks'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import styled from '@emotion/styled'
import debug from 'debug'
import { dequal } from 'dequal'
import { motion } from 'framer-motion'
import produce from 'immer'
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import invariant from 'tiny-invariant'
import { isDataAssetBlock, isVisualizationBlock } from '../Blocks/utils'
import {
  nativeSelection2Tellery,
  TellerySelection,
  tellerySelection2Native,
  TellerySelectionType
} from '../helpers/tellerySelection'
import {
  extractEntitiesFromToken,
  getTokensLength,
  isNonSelectbleToken,
  mergeTokens,
  splitToken,
  toggleMark,
  tokenPosition2SplitedTokenPosition
} from '../helpers/tokenManipulation'
import { useEditor } from '../hooks'
import { useBlockTitleAssets } from '../hooks/useBlockTitleAssets'
import { useSetInlineFormulaPopoverState } from '../hooks/useInlineFormulaPopoverState'
import { useLocalSelection } from '../hooks/useStorySelection'
import { BlockReferenceDropdown } from '../Popovers/BlockReferenceDropdown'
import { SlashCommandDropdown } from '../Popovers/SlashCommandDropdown'
import { decodeHTML } from '../utils'
import { BlockRenderer } from './BlockRenderer'

const logger = debug('tellery:contentEditable')
export interface EditableRef {
  openSlashCommandMenu: () => void
}

const InlineHoverPopoverContainer = styled.div`
  box-shadow: ${ThemingVariables.boxShadows[0]};
  background: #fff;
  color: ${ThemingVariables.colors.text[0]};
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
`

const InlinePopover: React.FC<{ content: ReactNode; reference: Element | null }> = ({ content, reference }) => {
  const tippyAnimation = useTippyMenuAnimation('fade')

  return (
    <LazyTippy
      render={() => {
        return <motion.div animate={tippyAnimation.controls}>{content}</motion.div>
      }}
      duration={150}
      onMount={tippyAnimation.onMount}
      onHide={tippyAnimation.onHide}
      reference={reference}
      placement="bottom"
    ></LazyTippy>
  )
}

const _ContentEditable: React.ForwardRefRenderFunction<
  EditableRef,
  {
    block: Editor.Block
    readonly?: boolean
    maxLines?: number
    disableSlashCommand?: boolean
    className?: string
    disableTextToolBar?: boolean
    placeHolderText?: string
    disableReferenceDropdown?: boolean
    placeHolderStrategy?: 'always' | 'never' | 'active'
    disableTextAlign?: boolean
    tokensRenderer?: (
      tokens: Editor.Token[],
      assetsMap: {
        [key: string]: Editor.Block
      }
    ) => string
  }
> = (props, ref) => {
  const editor = useEditor<Editor.Block>()
  const {
    block,
    readonly,
    maxLines = 0,
    disableReferenceDropdown,
    disableSlashCommand,
    tokensRenderer = BlockRenderer
  } = props
  const editbleRef = useRef<HTMLDivElement | null>(null)
  const [leavesHtml, setLeavesHtml] = useState<string | null>(null)
  const [willFlush, setWillFlush] = useState(false)
  const currentMarksRef = useRef<Editor.TokenType[] | null>(null)
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false)
  const [showSlashCommandDropdown, setShowSlashCommandDropdown] = useState(false)
  const [keywordRange, setKeywordRange] = useState<TellerySelection | null>(null)
  const [linkTokenReference, setLinkTokenReference] = useState<Element | null>(null)
  const [hoveringTokenIndex, setHoveringTokenIndex] = useState<number | null>(null)
  const isComposing = useRef(false)
  const [composingState, setComposingState] = useState(false)
  const localSelection = useLocalSelection(block.id)
  const isFocusing = !!localSelection
  const openStoryHandler = useOpenStory()
  const setInlineformulaPopoverState = useSetInlineFormulaPopoverState()
  const titleTokens = useMemo(() => block?.content?.title || [], [block?.content?.title])
  const blockTitleAssets = useBlockTitleAssets(block.storyId!, block.id)

  useEffect(() => {
    if (!isComposing.current) {
      const targetHtml = tokensRenderer(titleTokens, blockTitleAssets ?? {})
      setLeavesHtml(targetHtml)
    }
  }, [titleTokens, blockTitleAssets, tokensRenderer])

  useEffect(() => {
    if (readonly) return
    const element = editbleRef.current
    if (!element) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'B':
          case 'b':
            currentMarksRef.current = toggleMark(currentMarksRef.current, Editor.InlineType.Bold)
            break
          case 'I':
          case 'i':
            currentMarksRef.current = toggleMark(currentMarksRef.current, Editor.InlineType.Italic)
            break
          case 'U':
          case 'u':
            currentMarksRef.current = toggleMark(currentMarksRef.current, Editor.InlineType.Underline)
            break
          case 'E':
          case 'e':
            currentMarksRef.current = toggleMark(currentMarksRef.current, Editor.InlineType.Code)
            break
          case 'H':
          case 'h':
            currentMarksRef.current = toggleMark(currentMarksRef.current, Editor.InlineType.Hightlighted)
            break
        }
      }
    }
    element.addEventListener('keydown', onKeyDown)
    return () => {
      element.removeEventListener('keydown', onKeyDown)
    }
  }, [readonly, editbleRef])

  useLayoutEffect(() => {
    const element = editbleRef.current

    if (isFocusing && document.activeElement !== element) {
      // TODO: focus will lost after toggleBlockIndention, a flush is needed
      // use settimout to prevent error
      setTimeout(() => {
        setWillFlush(true)
      }, 0)
    }
    if (!isComposing.current && element) {
      // leavesHTML is encoded, but innerHTML is decoded
      if (leavesHtml !== null && decodeHTML(leavesHtml) !== decodeHTML(element.innerHTML)) {
        if (isFocusing && document.activeElement === element) {
          setWillFlush(true)
        }
        element.innerHTML = leavesHtml
      }
    }
  }, [isFocusing, leavesHtml])

  useEffect(() => {
    if (readonly) return
    setWillFlush(false)
    if (isFocusing === false) {
      editbleRef.current?.blur()
      return
    }
    const element = editbleRef.current
    if (!element) return

    if (decodeHTML(leavesHtml) !== decodeHTML(element.innerHTML)) {
      return
    }
    try {
      const range = tellerySelection2Native(localSelection!, editbleRef.current)
      range && restoreRange(range)
    } catch (e) {
      console.error('selection fail', e)
    }
  }, [isFocusing, willFlush, localSelection, block.id, readonly, leavesHtml])

  const syncInput = useCallback(() => {
    invariant(editor, 'editor context is null,')
    logger('is focusing', isFocusing, localSelection)
    if (!isComposing.current && editbleRef.current && isFocusing) {
      editbleRef.current.normalize()
      const newBlockTitle = deserialize(editbleRef.current, block.content?.title)
      const oldSelection = localSelection
      const oldTokens = block.content?.title ?? []

      if (!oldSelection || oldSelection.type !== TellerySelectionType.Inline) {
        invariant(false, 'Selection is Not Inline or is undefined')
      }
      const splitedTokens = splitToken(newBlockTitle)
      const changedLength = getTokensLength(newBlockTitle) - getTokensLength(oldTokens)
      const splitedTokensUpdated = updateTokensMark(
        block,
        oldSelection,
        splitedTokens,
        changedLength,
        currentMarksRef.current
      )
      if (splitedTokensUpdated === null) return

      const mergedTokens = mergeTokens(splitedTokensUpdated)

      if (dequal(newBlockTitle, titleTokens) === false) {
        console.log('merged tokesn', mergedTokens)
        editor?.updateBlockTitle?.(block.id, mergedTokens)
        // after toggle block, selection state will change, disable onSelect
        // setContentWillChange(true)
      }
    }
  }, [editor, isFocusing, localSelection, block, titleTokens])

  const splitedTokens: Editor.Token[] = useMemo(() => splitToken(block.content?.title ?? []), [block.content?.title])
  const previousSplitedTokens = usePrevious(splitedTokens)

  useEffect(() => {
    if (
      !previousSplitedTokens ||
      !splitedTokens ||
      !localSelection ||
      localSelection.type !== TellerySelectionType.Inline
    )
      return

    if (showReferenceDropdown || showSlashCommandDropdown) {
      setKeywordRange((range) => {
        if (range) {
          return {
            ...range,
            focus: localSelection.focus
          } as TellerySelection
        } else {
          return null
        }
      })
    } else {
      const changedLength = splitedTokens.length - previousSplitedTokens?.length
      const currentToken = titleTokens[localSelection?.anchor.nodeIndex] ?? ['']
      const textBefore = currentToken[0].slice(0, localSelection?.anchor.offset)

      if (changedLength > 0 && /[[|【]{2}$/.test(textBefore) && props.disableReferenceDropdown !== true) {
        setShowReferenceDropdown(true)
        setKeywordRange(localSelection)
      }

      if (changedLength > 0 && /\/$/.test(textBefore)) {
        logger('set show slash')
        setShowSlashCommandDropdown(true)
        setKeywordRange(localSelection)
      }
    }
  }, [
    localSelection,
    previousSplitedTokens,
    props.disableReferenceDropdown,
    showReferenceDropdown,
    showSlashCommandDropdown,
    splitedTokens,
    titleTokens
  ])

  const keyword = useMemo(() => {
    if (keywordRange === null || keywordRange.type === TellerySelectionType.Block) {
      return ''
    }
    const range = {
      start:
        tokenPosition2SplitedTokenPosition(
          block.content?.title ?? [],
          keywordRange.anchor.nodeIndex,
          keywordRange.anchor.offset
        ) ?? 0,
      end:
        tokenPosition2SplitedTokenPosition(
          block.content?.title ?? [],
          keywordRange.focus.nodeIndex,
          keywordRange.focus.offset
        ) ?? 0
    }
    return splitedTokens
      .slice(range.start, range.end)
      .map((token) => token[0])
      .join('')
  }, [keywordRange, block.content?.title, splitedTokens])

  useEffect(() => {
    if (isFocusing === false) {
      setKeywordRange(null)
      setShowReferenceDropdown(false)
      setShowSlashCommandDropdown(false)
    }
  }, [isFocusing])

  useImperativeHandle(
    ref,
    () => {
      return {
        openSlashCommandMenu: () => {
          if (localSelection) {
            setKeywordRange(localSelection)
            setShowSlashCommandDropdown(true)
          }
        }
      }
    },
    [localSelection]
  )

  const inlinePopoverContent = useMemo(() => {
    if (hoveringTokenIndex === null) return null
    const currentToken = titleTokens[hoveringTokenIndex]
    if (!currentToken) return null
    const entities = extractEntitiesFromToken(currentToken)
    if (entities.link) {
      const linkURL = entities.link[1]
      return <InlineHoverPopoverContainer>{linkURL}</InlineHoverPopoverContainer>
    } else if (entities.formula) {
      const formula = entities.formula[1]
      return <InlineHoverPopoverContainer>{formula}</InlineHoverPopoverContainer>
    }
    return null
  }, [hoveringTokenIndex, titleTokens])

  return (
    <div
      style={
        {
          '--max-lines': maxLines,
          textAlign: props.disableTextAlign ? 'left' : block?.format?.textAlign ?? 'left'
        } as React.CSSProperties
      }
      className={cx(
        css`
          display: flex;
          word-break: break-word;
          flex: 1;
          align-items: flex-start;
          position: relative;
        `,
        readonly &&
          maxLines !== 0 &&
          css`
            text-overflow: ellipsis;
            -webkit-line-clamp: var(--max-lines);
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
          `,
        props.disableTextToolBar === true ? 'tellery-no-select-toolbar' : 'tellery-select-toolbar',
        readonly &&
          css`
            user-select: text;
          `,
        props.className
      )}
    >
      <div
        ref={editbleRef}
        data-block
        style={
          {
            '--place-holder-text': props.placeHolderText
              ? `"${props.placeHolderText}"`
              : '"Type \' / \' for slash commands"'
          } as React.CSSProperties
        }
        className={cx(
          css`
            flex: 1;
            outline: none;
            min-height: 1.2em;
          `,
          !block.content?.title?.length &&
            (isFocusing || props.placeHolderStrategy === 'always') &&
            props.placeHolderStrategy !== 'never' &&
            composingState === false &&
            css`
              :after {
                content: var(--place-holder-text);
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                color: ${ThemingVariables.colors.gray[1]};
              }
            `
        )}
        onInput={syncInput}
        onCompositionStart={() => {
          isComposing.current = true
          setComposingState(true)
        }}
        onCompositionEnd={() => {
          isComposing.current = false
          setComposingState(false)
          syncInput()
        }}
        // placeholder="Type '/' for commands"
        suppressContentEditableWarning={true}
        onKeyDown={(e) => {
          if (!isFocusing) return
          if (!localSelection) return
          if (isComposing.current === false) {
            if (showReferenceDropdown || showSlashCommandDropdown) {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault()
                return
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                setShowReferenceDropdown(false)
                setShowSlashCommandDropdown(false)
                return
              }
            }
            if (e.key === 'Enter') {
              if (e.shiftKey === true) {
                e.stopPropagation()
              }
            } else if (e.key === 'Backspace') {
              if (
                localSelection?.type === TellerySelectionType.Inline &&
                localSelection.focus.nodeIndex === 0 &&
                localSelection.focus.offset === 0
              ) {
                if (isDataAssetBlock(block.type) || isVisualizationBlock(block.type)) {
                  e.stopPropagation()
                } else if (block.type !== Editor.BlockType.Text && block.type !== Editor.BlockType.Story) {
                  editor?.toggleBlockType(block.id, Editor.BlockType.Text, 0)
                  e.stopPropagation()
                }
              }
            }
          } else {
            e.stopPropagation()
          }
        }}
        onClick={(e) => {
          const tokenElement = e.target as HTMLElement
          const tokenRoot = tokenElement.closest('*[data-token-index]') as HTMLElement
          if (!tokenRoot) return
          const tokenIndex = parseInt(tokenRoot.dataset.tokenIndex || '0', 10)
          const token = block?.content?.title?.[tokenIndex]
          if (token) {
            const { link, reference, formula } = extractEntitiesFromToken(token)
            if (link) {
              if (e.defaultPrevented === false) {
                e.preventDefault()
                window.open(link[1] as string)
              }
              return
            }

            if (reference) {
              if (e.defaultPrevented === false) {
                e.preventDefault()
                if (reference[1] === 's') {
                  openStoryHandler(reference[2] as string, {
                    _currentStoryId: block.storyId,
                    isAltKeyPressed: e.altKey
                  })
                }
              }
            }
            if (formula) {
              e.preventDefault()
              e.stopPropagation()
              setInlineformulaPopoverState(true)
              const range = new Range()
              range.selectNodeContents(tokenElement)
              restoreRange(range)
              editor?.setSelectionState({
                storyId: block.storyId!,
                type: TellerySelectionType.Inline,
                focus: {
                  blockId: block.id,
                  nodeIndex: tokenIndex + 1,
                  offset: 0
                },
                anchor: {
                  blockId: block.id,
                  nodeIndex: tokenIndex,
                  offset: 0
                }
              })
            }
          }
        }}
        // contentEditable={'true'}
        contentEditable={readonly ? 'false' : 'true'}
        onSelect={(e) => {
          if (!editbleRef.current) return
          if (isComposing.current) return
          const _range = saveSelection(editbleRef.current)
          if (!_range) {
            return
            // invariant(false, 'range is falsy value')
          }
          logger('select', willFlush, e)
          if (!willFlush) {
            editor?.setSelectionState(nativeSelection2Tellery(block))
          }
          if (isComposing.current) return
          // dropDownRef?.current?.flush()
          const lastToken = splitedTokens[_range?.start - 1]
          const nextToken = splitedTokens[_range?.start]
          const nextMarks = nextToken?.[1] || []
          const marks = lastToken?.[1] || []
          if (shouldClenMarks(marks) && nextMarks && shouldClenMarks(nextMarks)) {
            currentMarksRef.current = []
          } else {
            currentMarksRef.current = marks
          }
        }}
        onBlurCapture={() => {
          // syncInput()
          setShowReferenceDropdown(false)
        }}
        onMouseDown={(e) => {
          setShowReferenceDropdown(false)
        }}
        onMouseOver={(e) => {
          const tokenElement = e.target as HTMLElement
          const tokenRoot = tokenElement.closest('.tellery-hoverable-token') as HTMLElement
          if (!tokenRoot) return
          setLinkTokenReference(tokenRoot)
          setHoveringTokenIndex(parseInt(tokenRoot.dataset.tokenIndex ?? '0', 10))
        }}
        data-root
      ></div>
      <InlinePopover content={inlinePopoverContent} reference={linkTokenReference}></InlinePopover>
      {readonly !== true && !disableReferenceDropdown && (
        <BlockReferenceDropdown
          open={showReferenceDropdown}
          setOpen={setShowReferenceDropdown}
          id={block.id}
          blockRef={editbleRef}
          keyword={keyword}
          selection={keywordRange}
        />
      )}
      {readonly !== true && !disableSlashCommand && (
        <SlashCommandDropdown
          open={showSlashCommandDropdown}
          setOpen={setShowSlashCommandDropdown}
          id={block.id}
          keyword={keyword}
          blockRef={editbleRef}
          selection={keywordRange}
        />
      )}
    </div>
  )
}

export const shouldClenMarks = (marks: Editor.TokenType[]) => {
  return (
    marks.findIndex(
      (x) =>
        x[0] === Editor.InlineType.Reference ||
        x[0] === Editor.InlineType.Code ||
        x[0] === Editor.InlineType.Link ||
        x[0] === Editor.InlineType.Formula ||
        x[0] === Editor.InlineType.Equation
    ) !== -1
  )
}

function updateTokensMark(
  block: Editor.Block,
  oldSelection: TellerySelection,
  splitedTokens: Editor.Token[],
  changedLength: number,
  currentMarks: Editor.TokenType[] | null
) {
  if (oldSelection.type !== TellerySelectionType.Inline) {
    return null
  }

  // logger(oldSelection.anchor.nodeIndex)

  const startIndex = tokenPosition2SplitedTokenPosition(
    block.content?.title || [],
    oldSelection.anchor.nodeIndex,
    oldSelection.anchor.offset
  )
  // invariant(startIndex, 'start index is null')
  const splitedTokensUpdated = produce(splitedTokens, (draftState) => {
    if (changedLength > 0) {
      const updateIndexes = new Array(changedLength).fill(undefined).map((x, i) => startIndex + i)
      for (const updateIndex of updateIndexes) {
        if (!draftState[updateIndex]) {
          break
        }
        // logger('marks', currentMarks)
        if (!currentMarks || currentMarks.length === 0) {
          if (isNonSelectbleToken(draftState[updateIndex]) === false) {
            draftState?.[updateIndex]?.[1] && delete draftState[updateIndex][1]
          }
        } else {
          if (currentMarks.length) {
            draftState[updateIndex][1] = currentMarks
          }
        }
      }
    }
  })
  return splitedTokensUpdated
}

export const ContentEditable = React.forwardRef(_ContentEditable)
// ContentEditable.whyDidYouRender = {
//   logOnDifferentValues: false,
//   customName: 'ContentEditable'
// }
