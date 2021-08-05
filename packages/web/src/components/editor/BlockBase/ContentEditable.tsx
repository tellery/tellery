import { deserialize, restoreRange, saveSelection } from '@app/components/editor/helpers/contentEditable'
import { useOpenStory, usePrevious } from '@app/hooks'
import { useMgetBlocksAny } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import debug from 'debug'
import { dequal } from 'dequal'
import produce from 'immer'
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { isQuestionLikeBlock } from '../Blocks/utils'
import {
  nativeSelection2Tellery,
  TellerySelection,
  tellerySelection2Native,
  TellerySelectionType
} from '../helpers/tellerySelection'
import {
  extractEntitiesFromToken,
  getTokensLength,
  mergeTokens,
  splitToken,
  toggleMark,
  tokenPosition2SplitedTokenPosition
} from '../helpers/tokenManipulation'
import { useEditor, useLocalSelection } from '../hooks'
import { BlockReferenceDropdown } from '../Popovers/BlockReferenceDropdown'
import { SlashCommandDropdown } from '../Popovers/SlashCommandDropdown'
import { BlockRenderer } from './BlockRenderer'

const logger = debug('tellery:contentEditable')
export interface EditableRef {
  openSlashCommandMenu: () => void
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
  }
> = (props, ref) => {
  const editor = useEditor<Editor.Block>()
  const { block, readonly, maxLines = 0, disableReferenceDropdown, disableSlashCommand } = props
  const editbleRef = useRef<HTMLDivElement | null>(null)
  const [leavesHtml, setLeavesHtml] = useState<string | null>(null)
  const [willFlush, setWillFlush] = useState(false)
  const currentMarksRef = useRef<Editor.TokenType[] | null>(null)
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false)
  const [showSlashCommandDropdown, setShowSlashCommandDropdown] = useState(false)
  const [keywordRange, setKeywordRange] = useState<TellerySelection | null>(null)
  const isComposing = useRef(false)
  const [composingState, setComposingState] = useState(false)
  const localSelection = useLocalSelection(block.id)
  const isFocusing = !!localSelection
  const openStoryHandler = useOpenStory()

  const titleTokens = useMemo(() => block?.content?.title || [], [block?.content?.title])

  const dependsAssetsKeys = useMemo(() => {
    return titleTokens
      ?.filter((token) => {
        return token[1]?.some((mark) => mark[0] === Editor.InlineType.Reference)
      })
      .map((token) => {
        const { reference: referenceEntity } = extractEntitiesFromToken(token)
        if (referenceEntity) {
          const id = referenceEntity[2]
          if (referenceEntity[1] === 's') {
            return id
          }
        }
        return null
      })
      .filter((x) => x !== null) as string[]
  }, [titleTokens])

  const { data: dependsAssetsResult } = useMgetBlocksAny(dependsAssetsKeys)
  // const dependsAssetsResult = useMgetBlocksSuspense(dependsAssetsKeys)

  useEffect(() => {
    if (!isComposing.current && titleTokens) {
      const targetHtml = BlockRenderer(titleTokens, dependsAssetsResult ?? {})
      // logger('setLeavesHtml', titleTokens, dependsAssetsResult)
      setLeavesHtml(targetHtml)
    }
  }, [titleTokens, dependsAssetsResult])

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

  useEffect(() => {
    const element = editbleRef.current

    if (isFocusing && document.activeElement !== element) {
      // TODO: focus will lost after toggleBlockIndention, a flush is needed
      // use settimout to prevent error
      setTimeout(() => {
        setWillFlush(true)
      }, 0)
    }
    if (!isComposing.current && element) {
      if (leavesHtml !== element.innerHTML && leavesHtml !== null) {
        if (isFocusing && document.activeElement === element) {
          setWillFlush(true)
        }
        element.innerHTML = leavesHtml
      }
    }
  }, [isFocusing, leavesHtml])

  useEffect(() => {
    if (readonly) return
    if (isFocusing === false) {
      setWillFlush(false)
      editbleRef.current?.blur()
      return
    }

    // TODO: it just works
    if (willFlush) {
      try {
        const range = tellerySelection2Native(localSelection!)
        range && restoreRange(range)
        logger('resotre range', range)
      } catch (e) {
        console.error('selection fail', e)
      }
      setWillFlush(false)
    }
  }, [isFocusing, willFlush, localSelection, block.id, readonly])

  const onMutation = useCallback(() => {
    invariant(editor, 'editor context is null,')
    logger('is focusing', isFocusing, localSelection)
    if (!isComposing.current && editbleRef.current && isFocusing) {
      editbleRef.current.normalize()
      const newBlockTitle = deserialize(editbleRef.current, block)
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
        editor?.setBlockValue?.(block.id, (block) => {
          block!.content!.title = mergedTokens
        })

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

  const onInput = onMutation

  const keyword = useMemo(() => {
    if (keywordRange === null || keywordRange.type === TellerySelectionType.Block) {
      return ''
    }
    // logger('keyword', keywordRange)
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
        onInput={onInput}
        onCompositionStart={() => {
          isComposing.current = true
          setComposingState(true)
        }}
        onCompositionEnd={() => {
          isComposing.current = false
          setComposingState(false)
          onInput()
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
                e.stopPropagation()
                return
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                setShowReferenceDropdown(false)
                setShowSlashCommandDropdown(false)
                // onKeyDown?.(e)
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
                e.preventDefault()
                if (isQuestionLikeBlock(block.type)) {
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
            const { link, reference } = extractEntitiesFromToken(token)
            if (link) {
              if (e.defaultPrevented === false) {
                e.preventDefault()
                window.open(link[1])
              }
              return
            }

            if (reference) {
              if (e.defaultPrevented === false) {
                e.preventDefault()
                if (reference[1] === 's') {
                  openStoryHandler(reference[2], {
                    _currentStoryId: block.storyId,
                    isAltKeyPressed: e.altKey
                  })
                }
              }
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
          if (
            marks.findIndex((x) => x[0] === Editor.InlineType.Code) !== -1 &&
            nextMarks &&
            nextMarks.findIndex((x) => x[0] === Editor.InlineType.Code) === -1
          ) {
            currentMarksRef.current = []
          } else if (
            marks.findIndex((x) => x[0] === Editor.InlineType.Link) !== -1 &&
            nextMarks &&
            nextMarks.findIndex((x) => x[0] === Editor.InlineType.Link) === -1
          ) {
            currentMarksRef.current = []
          } else if (
            marks.findIndex((x) => x[0] === Editor.InlineType.Reference) !== -1 &&
            nextMarks &&
            nextMarks.findIndex((x) => x[0] === Editor.InlineType.Reference) === -1
          ) {
            currentMarksRef.current = []
          } else {
            currentMarksRef.current = marks
          }
        }}
        onChange={() => {}}
        onBlurCapture={() => {
          setShowReferenceDropdown(false)
        }}
        onFocus={() => {}}
        onMouseDown={(e) => {
          setShowReferenceDropdown(false)
        }}
        data-root
      ></div>
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

// _RichTextBlock.whyDidYouRender = {
//   logOnDifferentValues: true,
//   customName: 'RichTextBlock'
// }

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
          if (isReferenceToken(draftState[updateIndex]) === false) {
            draftState?.[updateIndex]?.[1] && delete draftState[updateIndex][1]
          }
        } else {
          draftState[updateIndex][1] = currentMarks
        }
      }
    }
  })
  return splitedTokensUpdated
}

export const isReferenceToken = (token: Editor.Token) => {
  return !!token[1]?.some((tokenType) => tokenType[0] === Editor.InlineType.Reference)
}

export const ContentEditable = React.forwardRef(_ContentEditable)
// ContentEditable.whyDidYouRender = {
//   logOnDifferentValues: false,
//   customName: 'ContentEditable'
// }
