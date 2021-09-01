import { IconCommonLink } from '@app/assets/icons'
import { useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story } from '@app/types'
import { cx } from '@emotion/css'
import React, { CSSProperties } from 'react'
import ReactDOMServer from 'react-dom/server'
import { blockTitleToText, extractEntitiesFromToken, isNonSelectbleToken } from '../helpers/tokenManipulation'

export const COLORS = {
  blue: ThemingVariables.colors.palette.blue,
  orange: ThemingVariables.colors.palette.orange,
  yellow: ThemingVariables.colors.palette.yellow,
  green: ThemingVariables.colors.palette.green,
  pink: ThemingVariables.colors.palette.pink,
  purple: ThemingVariables.colors.palette.purple,
  gray: ThemingVariables.colors.palette.gray
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
      textDecoration: 'inherit',
      userSelect: 'text',
      borderBottom: 'solid 1px currentColor'
    })
  ]
])

export const INLINE_WRAPPER_STYLE = new Map([
  [
    Editor.InlineType.Link,
    (...args: string[]): CSSProperties => ({
      cursor: 'pointer',
      color: ThemingVariables.colors.primary[1],
      wordWrap: 'break-word',
      textDecoration: 'inherit',
      userSelect: 'text'
    })
  ],
  [
    Editor.InlineType.Formula,
    (...args: string[]): CSSProperties => ({
      cursor: 'pointer',
      color: ThemingVariables.colors.primary[1],
      wordWrap: 'break-word',
      textDecoration: 'inherit',
      borderBottom: 'dashed 1px currentColor',
      userSelect: 'text'
    })
  ]
])

export const getStylesForTokenText = (token: Editor.Token) => {
  const marks = token[1] || []
  return (
    marks
      .map((mark) => {
        return INLINE_STYLES.get(mark[0] as Editor.InlineType)?.(...(mark as string[]).slice(1)) as
          | CSSProperties
          | undefined
      })
      .reduce((a, c) => {
        return { ...a, ...c }
      }, {}) || {}
  )
}

const getTextElement = (token: Editor.Token, index: number, classNames?: string) => {
  const styles = getStylesForTokenText(token)
  const isPureTextToken = Object.keys(styles).length === 0 && classNames === undefined
  const text = token[0]
  const textSpan = isPureTextToken ? (
    <React.Fragment key={index}>{text}</React.Fragment>
  ) : (
    <>
      <span style={styles} data-token-index={index} className={classNames}>
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
  const {
    link: linkEntity,
    reference: referenceEntity,
    index: localIndex,
    classNames: localClassNames,
    formula: formulaEntity
  } = extractEntitiesFromToken(token)
  const realIndex = (localIndex?.[1] as number) ?? index
  const classNames = localClassNames ? localClassNames.slice(1).join(' ') ?? '' : undefined

  if (formulaEntity) {
    const styleGen = INLINE_WRAPPER_STYLE.get(Editor.InlineType.Formula)!

    return (
      <>
        <a
          data-token-index={realIndex}
          contentEditable={false}
          style={styleGen()}
          className={cx(classNames, 'tellery-hoverable-token', 'tellery-formula-token')}
        >
          <span style={{ whiteSpace: 'nowrap' }}></span>
          <span>{JSON.stringify(assetsMap[formulaEntity[1]]) ?? 'loading...'}</span>
          <span style={{ whiteSpace: 'nowrap' }}></span>
        </a>
      </>
    )
  }

  if (linkEntity) {
    const styleGen = INLINE_WRAPPER_STYLE.get(Editor.InlineType.Link)!

    return (
      <>
        <a
          href={linkEntity[1] as string}
          data-token-index={realIndex}
          target="_blank"
          rel="noopener noreferrer"
          style={styleGen()}
          className={cx(classNames, 'tellery-hoverable-token', 'tellery-link-token')}
        >
          <IconCommonLink height="1em" width="1em" viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }} />
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
      } else {
        title = 'loading...'
      }
      href = `/story/${id}`
    }
    const styleGen = INLINE_STYLES.get(Editor.InlineType.Reference)!
    return (
      <>
        <a
          href={href}
          data-token-index={realIndex}
          rel="noopener noreferrer"
          contentEditable={false}
          style={styleGen()}
          className={cx(classNames, 'tellery-hoverable-token', 'tellery-reference-token')}
        >
          <span style={{ whiteSpace: 'nowrap' }}></span>
          <span>{title}</span>
          <span style={{ whiteSpace: 'nowrap' }}></span>
        </a>
      </>
    )
  }

  return getTextElement(token, realIndex, classNames)
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
        return (
          <React.Fragment key={i}>
            <Token token={token} index={i} assetsMap={assetsMap} />
            {/* keep it to prevent safari selection issue */}
            {/* trim it in deserialize function */}
            {i === tokens.length - 1 && isNonSelectbleToken(token) ? '\n' : null}
          </React.Fragment>
        )
      }) || null}
    </>
  )
  return ReactDOMServer.renderToStaticMarkup(leafs)
}
