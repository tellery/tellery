import { MenuItem } from '@app/components/MenuItem'
import { useBlockHovering } from '@app/hooks/useBlockHovering'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { CodeBlockLang, CodeBlockLangDisplayName, Editor } from '@app/types'
import { TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx } from '@emotion/css'
import 'highlight.js/styles/default.css'
import { lowlight } from 'lowlight'
import type { LowlightElementSpan, Text as LowLightText } from 'lowlight/lib/core'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import invariant from 'tiny-invariant'
import { BlockRenderer } from '../BlockBase/BlockRenderer'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { EditorPopover } from '../EditorPopover'
import { mergeTokens, splitTokenAndMarkIndex, tokensToText } from '../helpers'
import { useLocalSelection } from '../hooks'
import { BlockComponent, registerBlock } from './utils'

const getSplitedTokens = (node: LowLightText | LowlightElementSpan, classnames: string[]): Editor.Token[] => {
  if (node.type === 'element') {
    const currentClassnames = [...classnames, ...node.properties.className]
    return node.children
      .map((child) => getSplitedTokens(child, currentClassnames))
      .reduce((a, c) => {
        a.push(...c)
        return a
      }, [])
  } else {
    const splitedText = node.value.split('')
    return splitedText.map((char) => [char, [[Editor.InlineType.LocalClassnames, ...classnames]]] as Editor.Token)
  }
}

const getHighlightedTokens = (tokens: Editor.Token[], language: string) => {
  const tokensText = tokensToText(tokens)
  const root = lowlight.highlight(language, tokensText)

  const highlightedSplitedTokens: Editor.Token[] = root.children
    .map((child) => getSplitedTokens(child, []))
    .reduce((a, c) => {
      a.push(...c)
      return a
    }, [])
  const splitedMarkedTokens = splitTokenAndMarkIndex(tokens)
  invariant(
    highlightedSplitedTokens.length === splitedMarkedTokens.length,
    'highlightedSplitedTokens is not equal to splitedTokens'
  )
  const hilightedTokens: Editor.Token[] = []
  for (let i = 0; i < splitedMarkedTokens.length; i++) {
    const currentToken = splitedMarkedTokens[i]
    const classnames = (highlightedSplitedTokens[i][1] as Editor.TokenType[])[0].slice(1) as string[]
    hilightedTokens[i] = [
      currentToken[0],
      [...(currentToken[1] ?? []), [Editor.InlineType.LocalClassnames, ...classnames]]
    ]
  }
  return mergeTokens(hilightedTokens)
}

const codeBlockRenderer = (language: string = 'SQL') => {
  return (tokens: Editor.Token[], assestsMap: Record<string, Editor.BaseBlock>) => {
    const highlightedMarkedTokens = getHighlightedTokens(tokens, language)
    return BlockRenderer(highlightedMarkedTokens, assestsMap)
  }
}

const CodeBlock: BlockComponent<
  React.FC<{
    block: Editor.CodeBlock
  }>
> = ({ block }) => {
  const localSelection = useLocalSelection(block.id)
  const languageRender = useMemo(() => {
    return codeBlockRenderer(block.content.lang)
  }, [block.content.lang])

  const pasteHandler = useCallback((e: React.ClipboardEvent<HTMLElement>) => {
    if (e.clipboardData && e.clipboardData.files.length === 0) {
      const telleryBlockDataStr = e.clipboardData.getData(TELLERY_MIME_TYPES.BLOCKS)
      const telleryTokenDataStr = e.clipboardData.getData(TELLERY_MIME_TYPES.TOKEN)
      const pureText = e.clipboardData.getData('text/plain')
      if (!telleryBlockDataStr && !telleryTokenDataStr && pureText) {
        e.clipboardData.clearData()
        e.clipboardData.setData('text/plain', pureText)
        e.stopPropagation()
      }
    }
  }, [])

  return (
    <>
      <div
        className={cx(
          css`
            display: flex;
            padding: 30px;
            line-height: 1;
            font-size: 1em;
            background-color: ${ThemingVariables.colors.primary[5]};
            font-family: monospace;
            white-space: pre;
            overflow: auto;
            position: relative;
          `
        )}
        onKeyDown={(e) => {
          if (!localSelection) return
          if (e.key === 'Enter') {
            document.execCommand('insertLineBreak')
            e.preventDefault()
            e.stopPropagation()
          } else if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()
            if (e.shiftKey) return
            // TODO: custom insert text will insert after linebreak
            document.execCommand('insertText', false, '  ')
          }
        }}
        onPaste={pasteHandler}
      >
        <CodeBlockOperation block={block as Editor.CodeBlock} />
        <ContentEditable block={block} placeHolderStrategy="never" tokensRenderer={languageRender}></ContentEditable>
      </div>
    </>
  )
}

CodeBlock.meta = {
  isText: true,
  hasChildren: false
}

registerBlock(Editor.BlockType.Code, CodeBlock)

const SUPPORT_LANGS = Object.keys(CodeBlockLangDisplayName) as CodeBlockLang[]

const CodeBlockOperation = (props: {
  // show: boolean
  block: Editor.CodeBlock
  // setBlock?: SetBlock<Editor.CodeBlock>
}) => {
  const { block } = props
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const blockTranscation = useBlockTranscations()
  const show = useBlockHovering(block.id)

  const toggleCodeBlockLangHandler = useCallback(
    (lang: CodeBlockLang) => {
      blockTranscation.updateBlockProps(block.storyId!, block.id, ['content', 'lang'], lang)
      setOpen(false)
    },
    [block.id, block.storyId, blockTranscation]
  )

  return (
    <div
      style={{
        opacity: show ? 1 : 0
      }}
      className={css`
        flex-shrink: 0;
        margin-right: 2px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        position: absolute;
        top: 0;
        left: 0;
        transition: opacity ease 250ms;
      `}
    >
      <div
        ref={ref}
        className={css`
          font-size: 0.8em;
          line-height: 1;
          margin-bottom: 0.1em;
          user-select: none;
          cursor: pointer;
          padding: 10px;
          color: ${ThemingVariables.colors.text[1]};
        `}
        onClick={() => {
          setOpen(true)
        }}
      >
        {CodeBlockLangDisplayName[props.block.content?.lang || CodeBlockLang.JavaScript]}
      </div>
      <EditorPopover open={open} setOpen={setOpen} referenceElement={ref.current} placement="left-start">
        <div
          className={css`
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
            /* width: 300px; */
            padding: 8px;
          `}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((index) => {
                return index <= 1 ? 0 : index - 1
              })
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((index) => {
                return index >= length ? length : index + 1
              })
            } else if (e.key === 'Enter') {
              toggleCodeBlockLangHandler(SUPPORT_LANGS[index])
              // questionSearchResultClickHandler(selectedQuestionResultIndex)
            }
          }}
        >
          <div
            className={css`
              font-size: 14px;
              color: ${ThemingVariables.colors.gray[0]};
              background: ${ThemingVariables.colors.gray[5]};
              box-sizing: border-box;
              border-radius: 8px;
              font-size: 14px;
              line-height: 17px;
              color: ${ThemingVariables.colors.text[1]};
              margin: 4px;
            `}
          ></div>
          <div
            className={css`
              max-height: 300px;
              overflow: auto;
            `}
          >
            {SUPPORT_LANGS.map((lang, i) => {
              return (
                <LangItemCell
                  key={lang}
                  onClick={() => {
                    toggleCodeBlockLangHandler(lang)
                  }}
                  selected={index === i}
                  index={i}
                  setIndex={setIndex}
                  name={CodeBlockLangDisplayName[lang]}
                ></LangItemCell>
              )
            })}
          </div>
        </div>
      </EditorPopover>
    </div>
  )
}

const LangItemCell = (props: {
  onClick: () => void
  selected: boolean
  index: number
  name: string
  setIndex: (index: number) => void
}) => {
  const { name, selected, index } = props
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (selected) {
      ref.current &&
        scrollIntoView(ref.current, {
          scrollMode: 'if-needed',
          block: 'nearest',
          inline: 'nearest'
        })
    }
  }, [selected])

  return (
    <div
      ref={ref}
      onClick={props.onClick}
      tabIndex={index}
      className={css`
        cursor: pointer;
        font-size: 14px;
        line-height: 17px;
        color: ${ThemingVariables.colors.text[0]};
        outline: none;
        width: 100px;
      `}
    >
      <MenuItem title={name} onClick={props.onClick} />
    </div>
  )
}
