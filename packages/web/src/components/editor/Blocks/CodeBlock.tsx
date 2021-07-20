import { useBlockHovering } from '@app/hooks/useBlockHovering'
import { css, cx } from '@emotion/css'
import { MenuItem } from 'components/MenuItem'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ThemingVariables } from 'styles'
import { CodeBlockLang, CodeBlockLangDisplayName, Editor } from 'types'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { EditorPopover } from '../EditorPopover'
import { useEditor } from '../hooks'
import { BlockComponent, registerBlock } from './utils'

const CodeBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
  }>
> = ({ block }) => {
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
            position: relative;
          `
        )}
      >
        <CodeBlockOperation block={block as Editor.CodeBlock} />
        <ContentEditable block={block} placeHolderStrategy="never"></ContentEditable>
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
  const editor = useEditor<Editor.CodeBlock>()
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const show = useBlockHovering(block.id)

  const toggleCodeBlockLangHandler = useCallback(
    (lang: CodeBlockLang) => {
      editor?.setBlockValue?.(props.block.id, (block) => {
        block.content.lang = lang
      })
      setOpen(false)
    },
    [editor, props.block.id]
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
