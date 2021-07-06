import { css } from '@emotion/css'
import React, { CSSProperties, useEffect, useRef } from 'react'
import ReactDOMServer from 'react-dom/server'
import { useBlockSnapshot } from 'store/block'
import { ThemingVariables } from 'styles'
import { Editor, Story } from 'types'
import { blockTitleToText, extractEntitiesFromToken } from '../helpers/tokenManipulation'

export const COLORS = {
  blue: ThemingVariables.colors.visualization[0],
  orange: ThemingVariables.colors.visualization[1],
  yellow: ThemingVariables.colors.visualization[2],
  green: ThemingVariables.colors.visualization[3],
  pink: ThemingVariables.colors.visualization[4],
  red: ThemingVariables.colors.visualization[5],
  teal: ThemingVariables.colors.visualization[6],
  brown: ThemingVariables.colors.visualization[8],
  purple: ThemingVariables.colors.visualization[9],
  gray: ThemingVariables.colors.gray[0]
}

export const INLINE_STYLES = new Map([
  [Editor.InlineType.Bold, (...args: string[]): CSSProperties => ({ fontWeight: 600 })],
  [Editor.InlineType.Underline, (...args: string[]): CSSProperties => ({ borderBottom: 'solid 1px currentColor' })],
  [Editor.InlineType.Strike, (...args: string[]): CSSProperties => ({ textDecoration: 'line-through' })],
  [Editor.InlineType.Italic, (...args: string[]): CSSProperties => ({ fontStyle: 'italic' })],
  [
    Editor.InlineType.Code,
    (...args: string[]): CSSProperties => ({
      fontFamily: 'monospace',
      background: ThemingVariables.colors.primary[5],
      color: ThemingVariables.colors.code[0],
      borderRadius: '4px',
      padding: '0.2em 0.4em'
    })
  ],
  [
    Editor.InlineType.Reference,
    (...args: string[]): CSSProperties => ({
      cursor: 'pointer',
      wordWrap: 'break-word',
      fontWeight: 500,
      textDecoration: 'inherit',
      color: ThemingVariables.colors.primary[1],
      userSelect: 'text'
    })
  ],
  [
    Editor.InlineType.Hightlighted,
    (...args: string[]): CSSProperties => {
      const colorArg = args[0] ?? 'orange'
      const isBackground = colorArg.split('_')[1] === 'background'
      const colorName = colorArg.split('_')[0] as keyof typeof COLORS
      const colorValue = COLORS[colorName]
      if (isBackground) {
        return { backgroundColor: colorValue }
      } else {
        return { color: colorValue }
      }
    }
  ],
  [
    Editor.InlineType.Link,
    (...args: string[]): CSSProperties => ({
      cursor: 'pointer',
      color: ThemingVariables.colors.primary[1],
      wordWrap: 'break-word',
      fontWeight: 500,
      textDecoration: 'inherit',
      userSelect: 'text'
    })
  ]
])

export const getStylesForTokenText = (token: Editor.Token) => {
  const marks = token[1] || []
  return (
    marks
      .map((mark) => {
        return INLINE_STYLES.get(mark[0] as Editor.InlineType)?.(...mark.slice(1)) as CSSProperties | undefined
      })
      .reduce((a, c) => {
        return { ...a, ...c }
      }, {}) || {}
  )
}

const getTextElement = (token: Editor.Token, index: number) => {
  const isPureTextToken = token.length === 1
  const text = token[0]
  const textSpan = isPureTextToken ? (
    <React.Fragment key={index}>{text}</React.Fragment>
  ) : (
    <>
      <span style={getStylesForTokenText(token)} data-token-index={index}>
        {text}
      </span>
    </>
  )
  return textSpan
}

export const Token = ({
  token,
  index,
  assetsMap
}: {
  token: Editor.Token
  index: number
  assetsMap: {
    [key: string]: Editor.Block
  }
}) => {
  const snapshot = useBlockSnapshot()
  const { link: linkEntity, reference: referenceEntity } = extractEntitiesFromToken(token)
  if (linkEntity) {
    const styleGen = INLINE_STYLES.get(Editor.InlineType.Link)!

    return (
      <>
        <a href={linkEntity[1]} data-token-index={index} target="_blank" rel="noopener noreferrer" style={styleGen()}>
          <span style={{ whiteSpace: 'nowrap' }}></span>
          {getTextElement(token, index)}
          <span style={{ whiteSpace: 'nowrap' }}></span>
        </a>
      </>
    )
  }

  if (referenceEntity) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_prefix, type, id] = referenceEntity
    let title = ''
    let href = ''
    if (type === 's') {
      const targetAsset = assetsMap[id] as Story
      if (targetAsset) {
        title = blockTitleToText(targetAsset, snapshot)
      }
      href = `/story/${id}`
    }
    const styleGen = INLINE_STYLES.get(Editor.InlineType.Reference)!
    return (
      <>
        <a href={href} data-token-index={index} rel="noopener noreferrer" contentEditable={false} style={styleGen()}>
          <span style={{ whiteSpace: 'nowrap' }}></span>
          <span>{title}</span>
          <span style={{ whiteSpace: 'nowrap' }}></span>
        </a>
      </>
    )
  }

  return getTextElement(token, index)
}

export const BlockRenderer = (
  tokens: Editor.Token[],
  assetsMap: {
    [key: string]: Editor.Block
  }
) => {
  const leafs = (
    <>
      {tokens?.map((token, i) => {
        return <Token token={token} index={i} key={i} assetsMap={assetsMap} />
      }) || null}
    </>
  )
  return ReactDOMServer.renderToStaticMarkup(leafs)
}

export const BlockRendererElement = ({
  tokens,
  setHtml,
  assetsMap
}: {
  tokens: Editor.Token[]
  setHtml: (html?: string) => void
  assetsMap: {
    [key: string]: Editor.Block
  }
}) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    setHtml(ref.current?.innerHTML)
    const observer = new MutationObserver(() => {
      setHtml(ref.current?.innerHTML)
    })
    observer.observe(ref.current, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observer.disconnect()
    }
  }, [setHtml])

  return (
    <div
      className={css`
        display: none;
        pointer-events: none;
      `}
      ref={ref}
    >
      <>
        {tokens?.map((token, i) => {
          return <Token token={token} index={i} key={i} assetsMap={assetsMap} />
        }) ?? null}
      </>
    </div>
  )
}
