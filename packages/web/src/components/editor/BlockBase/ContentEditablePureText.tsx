import { deserialize, restoreRange, saveSelection } from '@app/components/editor/helpers/contentEditable'
import { ThemingVariables } from '@app/styles'
import type { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import debug from 'debug'
import { dequal } from 'dequal'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BlockRenderer } from './BlockRenderer'

const logger = debug('tellery:contentEditable')
export interface EditableRef {
  openSlashCommandMenu: () => void
}

const decodeHTML = function (html: string | null) {
  if (typeof html === 'string') {
    const txt = document.createElement('textarea')
    txt.innerHTML = html
    const value = txt.value
    txt.remove()
    return value
  }

  return ''
}

const _ContentEditable: React.ForwardRefRenderFunction<
  EditableRef,
  {
    tokens?: Editor.Token[]
    readonly?: boolean
    maxLines?: number
    className?: string
    placeHolderText?: string
    placeHolderStrategy?: 'always' | 'never' | 'active'
    textAlign?: string
    disableTextAlign?: boolean
    disableEnter?: boolean
    onChange: (tokens: Editor.Token[]) => void
    tokensRenderer?: (
      tokens: Editor.Token[],
      assetsMap: {
        [key: string]: Editor.Block
      }
    ) => string
  }
> = (props, ref) => {
  const { tokens, onChange, readonly, maxLines = 0, tokensRenderer = BlockRenderer } = props
  const editbleRef = useRef<HTMLDivElement | null>(null)
  const [leavesHtml, setLeavesHtml] = useState<string | null>(null)
  const [willFlush, setWillFlush] = useState(false)
  const isComposing = useRef(false)
  const [selectionRange, setSelectionRange] = useState<Range | null>(null)
  const [isFocusing, setIsFocusing] = useState(false)
  const [composingState, setComposingState] = useState(false)

  useEffect(() => {
    if (!isComposing.current && tokens) {
      const targetHtml = tokensRenderer(tokens, {})
      setLeavesHtml(targetHtml)
    }
  }, [tokens, tokensRenderer])

  useEffect(() => {
    if (readonly) return
    const element = editbleRef.current
    if (!element) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'B':
          case 'b':
          case 'I':
          case 'i':
          case 'U':
          case 'u':
          case 'E':
          case 'e':
          case 'H':
          case 'h':
          case 'S':
          case 's':
            e.preventDefault()
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
      // leavesHTML is encoded, but innerHTML is decoded
      if (leavesHtml !== null && decodeHTML(leavesHtml) !== element.innerHTML) {
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
        const range = selectionRange
        range && restoreRange(range)
        logger('resotre range', range)
      } catch (e) {
        console.error('selection fail', e)
      }
      setWillFlush(false)
    }
  }, [isFocusing, willFlush, readonly, selectionRange])

  const onInput = useCallback(() => {
    console.log('onMutation', editbleRef.current, isFocusing)
    if (!isComposing.current && editbleRef.current && isFocusing) {
      editbleRef.current.normalize()
      const newBlockTitle = deserialize(editbleRef.current, tokens)
      console.log('onMutation', newBlockTitle, tokens)
      if (dequal(newBlockTitle, tokens) === false) {
        console.log('onMutation', newBlockTitle)
        onChange(newBlockTitle)
      }
    }
  }, [isFocusing, tokens, onChange])

  return (
    <div
      style={
        {
          '--max-lines': maxLines,
          textAlign: props.textAlign ?? 'left'
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
        'tellery-no-select-toolbar',
        readonly &&
          css`
            user-select: text;
          `,
        props.className
      )}
    >
      <div
        ref={editbleRef}
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
          !tokens?.length &&
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
        suppressContentEditableWarning={true}
        onKeyDown={(e) => {
          if (props.disableEnter && e.key === 'Enter' && isComposing.current === false) {
            e.preventDefault()
            e.stopPropagation()
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
          if (!willFlush) {
            const sel = getSelection()
            const range = sel?.getRangeAt(0)
            range && setSelectionRange(range?.cloneRange())
          }
        }}
        onFocus={() => {
          console.log('is focusing')
          setIsFocusing(true)
        }}
        onBlur={() => {
          setIsFocusing(false)
        }}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          if (text) {
            document.execCommand('insertText', false, text)
          }
        }}
        data-root
      ></div>
    </div>
  )
}

export const ContentEditablePureText = React.forwardRef(_ContentEditable)
// ContentEditable.whyDidYouRender = {
//   logOnDifferentValues: false,
//   customName: 'ContentEditable'
// }
