import { BlockSnapshot, getBlockFromSnapshot } from '@app/store/block'
import { Editor } from '@app/types'
import { DEFAULT_TITLE, TelleryGlyph, TELLERY_MIME_TYPES } from '@app/utils'
import dayjs from 'dayjs'
import { dequal } from 'dequal'
import invariant from 'tiny-invariant'
import { isDataAssetBlock, isVisualizationBlock } from '../Blocks/utils'
import { getSubsetOfBlocksSnapshot, TOKEN_MAP } from '../utils'
import { TellerySelection, TellerySelectionType } from './tellerySelection'

export const mergeTokens = (tokens: Editor.Token[]) => {
  return tokens.reduce((acc: Editor.Token[], current: Editor.Token) => {
    if (acc.length === 0) {
      acc.push([current[0]])
    } else {
      const lastToken = acc[acc.length - 1]
      const lastTokenMarks = lastToken.slice(1) || []
      const currentTokenMarks = current.slice(1) || []
      if (current[0].length) {
        if (dequal(lastTokenMarks.sort(), currentTokenMarks.sort()) && isNonSelectbleToken(current) === false) {
          acc[acc.length - 1][0] = `${acc[acc.length - 1][0]}${current[0]}`
        } else {
          acc.push([...current])
        }
      }
    }
    return acc
  }, [])
}

export const applyTransformOnTokensFromSelectionState = (
  tokens: Editor.Token[],
  selectionState: TellerySelection,
  transform?: (token: Editor.Token) => Editor.Token
) => {
  if (selectionState.type === TellerySelectionType.Block) {
    return tokens
  } else {
    const splitedTokens = splitToken(tokens)
    const range = {
      start:
        tokenPosition2SplitedTokenPosition(tokens, selectionState.anchor.nodeIndex, selectionState.anchor.offset) ?? 0,
      end: tokenPosition2SplitedTokenPosition(tokens, selectionState.focus.nodeIndex, selectionState.focus.offset) ?? 0
    }
    const transformedTokens = applyTransformOnSplitedTokens(splitedTokens, range, transform)
    const mergedTokens = mergeTokens(transformedTokens)
    return mergedTokens
  }
}

export const applyTransformOnTokens = (
  tokens: Editor.Token[],
  range?: { start: number; end: number } | null,
  transform?: (token: Editor.Token) => Editor.Token
) => {
  const splitedTokens = splitToken(tokens)
  const transformedTokens = applyTransformOnSplitedTokens(splitedTokens, range, transform)
  const mergedTokens = mergeTokens(transformedTokens)
  return mergedTokens
}

export const applyTransformOnSplitedTokens = (
  splitedTokens: Editor.Token[],
  range?: { start: number; end: number } | null,
  transform?: (token: Editor.Token) => Editor.Token
) => {
  return splitedTokens.map((token, i) => {
    if (range) {
      if (transform && i >= range.start && i < range.end) {
        return transform(token)
      } else {
        return token
      }
    } else {
      return token
    }
  })
}

// TODO: Fix Me
export const getBlockOrTokensFromSelection = (
  block: Editor.BaseBlock,
  selection: TellerySelection
): Editor.BaseBlock | Editor.Token[] => {
  if (selection.type === TellerySelectionType.Inline) {
    const tokens = block?.content?.title || []
    const splitedTokens = splitToken(tokens)
    const startPosition =
      selection.anchor.blockId === block.id
        ? tokenPosition2SplitedTokenPosition(tokens, selection.anchor.nodeIndex, selection.anchor.offset)
        : null
    const endPosition =
      selection.focus.blockId === block.id
        ? tokenPosition2SplitedTokenPosition(tokens, selection.focus.nodeIndex, selection.focus.offset)
        : null

    if (startPosition !== null && endPosition !== null) {
      return mergeTokens(splitedTokens.slice(startPosition, endPosition))
    }
    if (startPosition === null && endPosition === null) {
      return block
    }
  } else {
    return block
  }

  return block
}

export const getBlocksFragmentFromSelection = (selectionState: TellerySelection, snapshot: BlockSnapshot) => {
  if (selectionState === null)
    return {
      type: TELLERY_MIME_TYPES.BLOCKS,
      value: {
        children: [],
        data: {}
      }
    }

  if (selectionState.type === TellerySelectionType.Inline) {
    const fragment = getBlockOrTokensFromSelection(
      getBlockFromSnapshot(selectionState.anchor.blockId, snapshot),
      selectionState
    )
    return {
      type: TELLERY_MIME_TYPES.TOKEN,
      value: fragment as Editor.Token[]
    }
  } else if (selectionState.type === TellerySelectionType.Block) {
    const selectedIds = selectionState.selectedBlocks
    return {
      type: TELLERY_MIME_TYPES.BLOCKS,
      value: {
        children: selectedIds,
        data: getSubsetOfBlocksSnapshot(snapshot, selectedIds)
      }
    }
  }
}

// TODO: display children text
export const convertBlocksOrTokensToPureText = (
  fragment: {
    type: string
    value:
      | {
          children: string[]
          data: Record<string, Editor.BaseBlock>
        }
      | Editor.Token[]
  },
  snapshot: BlockSnapshot
) => {
  if (fragment.type === TELLERY_MIME_TYPES.TOKEN) {
    return tokensToText(fragment.value as Editor.Token[], snapshot)
  } else if (fragment.type === TELLERY_MIME_TYPES.BLOCKS) {
    const value = fragment.value as {
      children: string[]
      data: Record<string, Editor.BaseBlock>
    }

    return value.children
      .map((id) => {
        const block = value.data[id]
        return blockTitleToText(block, snapshot)
      })
      .join('\n')
  }
  return 'tellery'
}

export const sanitizeContent = (content?: Editor.BaseBlock['content']) => {
  if (content?.title) {
    return { ...content, title: sanitizeToken(content.title || []) }
  } else {
    return content
  }
}

export const sanitizeToken = (tokens?: Editor.Token[]) => {
  const splitedTokens = splitToken(tokens)
  const transformedTokens = applyTransformOnSplitedTokens(
    splitedTokens,
    { start: 0, end: splitedTokens.length },
    (token: Editor.Token) => {
      return token
    }
  )
  const mergedTokens = mergeTokens(transformedTokens)
  return mergedTokens
}

export const splitToken = (title?: Editor.Token[]) => {
  return (
    title?.reduce((acc: Editor.Token[], token) => {
      const splitedToken = token[0].split('').map((text): Editor.Token => (token[1] ? [text, token[1]] : [text]))
      acc.push(...splitedToken)
      return acc
    }, []) || []
  )
}

export const splitTokenAndMarkIndex = (title?: Editor.Token[]) => {
  return (
    title?.reduce((acc: Editor.Token[], token, index) => {
      const splitedToken = token[0]
        .split('')
        .map((text): Editor.Token => [text, [[Editor.InlineType.LocalIndex, index], ...(token[1] ?? [])]])
      acc.push(...splitedToken)
      return acc
    }, []) || []
  )
}

export const blockTitleToText = (block: Editor.BaseBlock, snapshot: BlockSnapshot): string => {
  if (isDataAssetBlock(block.type) || isVisualizationBlock(block.type) || block.type === Editor.BlockType.Story) {
    if (!block.content?.title?.length) {
      return DEFAULT_TITLE
    }
  } else if (block.type === Editor.BlockType.Thought) {
    return ((block.content as any)?.date && dayjs((block.content as any)?.date).format('MMM DD, YYYY')) ?? DEFAULT_TITLE
  }
  const text = tokensToText(block.content?.title ?? [], snapshot)
  return text
}

export const tokensToText = (tokens: Editor.Token[] = [], snapshot?: BlockSnapshot): string => {
  return tokens
    .map((token) => {
      const { reference: referenceEntity } = extractEntitiesFromToken(token)
      if (referenceEntity) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_prefix, type, id] = referenceEntity
        if (type === 's') {
          if (snapshot) {
            try {
              const block = getBlockFromSnapshot(id as string, snapshot)
              return blockTitleToText(block, snapshot)
            } catch {
              return TelleryGlyph.BI_LINK
            }
          }
          return TelleryGlyph.BI_LINK
        }
        return ''
      }
      return token[0]
    })
    .join('')
}

export const getTokensLength = (tokens: Editor.Token[]) => {
  return tokens.reduce((acc, token) => {
    acc += getTokenLength(token)
    return acc
  }, 0)
}

export const getTokenLength = (token: Editor.Token) => {
  if (isNonSelectbleToken(token)) {
    return 1
  }
  return (token?.[0] || '').split('').length
}

export const getLastPosition = (tokens: Editor.Token[]) => {
  if (tokens.length === 0) {
    return [0, 0]
  }
  return [tokens.length - 1, tokens[tokens.length - 1][0].length]
}

export const tokenPosition2SplitedTokenPosition = (
  tokens: Editor.Token[] | undefined,
  tokenIndex: number,
  offset: number
) => {
  invariant(tokenIndex !== -1, ' tokenIndex is -1')
  let splitedOffset = 0
  for (let i = 0; i < tokenIndex; i++) {
    const tokenText = tokens?.[i]?.[0]
    if (tokenText) {
      splitedOffset += tokenText.length
    }
  }
  splitedOffset += offset
  return splitedOffset
}

export const splitedTokenPosition2TokenPosition = (tokens: Editor.Token[], offset: number) => {
  let splitedOffset = offset < 0 ? 0 : offset
  for (let i = 0; i < tokens.length; i++) {
    const tokenText = tokens?.[i]?.[0]

    if (tokenText) {
      splitedOffset -= tokenText.length
    }
    if (splitedOffset <= 0) {
      if (isNonSelectbleToken(tokens[i])) {
        return [i + 1, 0]
      }
      return [i, splitedOffset + tokenText.length < 0 ? 0 : splitedOffset + tokenText.length]
    }
  }
  return [tokens.length - 1 < 0 ? 0 : tokens.length - 1, 0]
}

export const splitBlockTokens = (tokens: Editor.Token[] | undefined, selection: TellerySelection) => {
  if (selection.type === TellerySelectionType.Block) return [mergeTokens(tokens ?? [])]
  const splitedTokens = splitToken(tokens)
  const position = tokenPosition2SplitedTokenPosition(tokens, selection.anchor.nodeIndex, selection.anchor.offset)
  if (position === null) {
    return [mergeTokens(splitedTokens)]
  }
  return [mergeTokens(splitedTokens.slice(0, position)), mergeTokens(splitedTokens.slice(position))]
}

export const isSelectionCollapsed = (selection?: TellerySelection) => {
  if (!selection) return false
  if (selection.type === TellerySelectionType.Block) return false
  return (
    selection.anchor.blockId === selection.focus.blockId &&
    selection.anchor.nodeIndex === selection.focus.nodeIndex &&
    selection.anchor.offset === selection.focus.offset &&
    selection.anchor.nodeIndex !== -1
  )
}

export const isSelectionAtStart = (selection?: TellerySelection) => {
  if (!selection) return false
  if (selection.type === TellerySelectionType.Block) return false

  return isSelectionCollapsed(selection) && selection.anchor.nodeIndex === 0 && selection.anchor.offset === 0
}

export const isBlockLevelSelection = (selection?: TellerySelection) => {
  if (!selection) return false
  if (selection.type === TellerySelectionType.Block) return true
  return false
}

export const isSelectionCrossBlock = (selection?: TellerySelection) => {
  if (!selection) return false
  if (
    selection.type === TellerySelectionType.Block &&
    Object.values(selection.selectedBlocks).filter((value) => value).length > 1
  )
    return true
  return false
}

export const sortMarks = (marks: Editor.TokenType[]) => {
  return marks.sort((a, b) => {
    return a[0].charCodeAt(0) - b[0].charCodeAt(0)
  })
}

export const marksArrayToMarksMap = (marks: Editor.TokenType[]) => {
  const marksMap =
    marks?.reduce((a, c) => {
      a[c[0]] = c.slice(1) || []
      return a
    }, {} as { [key: string]: (string | number)[] }) || {}
  return marksMap
}

export const marksMapToMarksArray = (map: { [key: string]: (string | number)[] }) => {
  const keys = Object.keys(map) as Editor.InlineType[]
  const marks: Editor.TokenType[] = keys.map((key) => [key, ...map[key]])
  return sortMarks(marks)
}

export const addMark = (
  marks: Editor.TokenType[] | undefined | null,
  mark: Editor.InlineType,
  args: (string | number)[]
) => {
  const marksMap = marksArrayToMarksMap(marks || [])
  marksMap[mark] = args
  const uniqueMarks = marksMapToMarksArray(marksMap)
  return uniqueMarks
}
export const removeMark = (marks: Editor.TokenType[] | undefined | null, mark: Editor.InlineType) => {
  if (!marks) return null
  const marksMap = marksArrayToMarksMap(marks)
  delete marksMap[mark]
  const uniqueMarks = marksMapToMarksArray(marksMap)
  return uniqueMarks
}

export const toggleMark = (marks: Editor.TokenType[] | undefined | null, mark: Editor.InlineType) => {
  if (!marks) {
    return addMark(marks, mark, [])
  }
  const marksMap = marksArrayToMarksMap(marks)
  if (marksMap[mark]) {
    return removeMark(marks, mark)
  } else {
    return addMark(marks, mark, [])
  }
}

export const isNonSelectbleToken = (token: Editor.Token) => {
  const { reference, formula, equation } = extractEntitiesFromToken(token)
  if (reference || formula || equation) {
    return true
  }
  return false
}

export const extractEntitiesFromToken = (token: Editor.Token) => {
  const entities: Record<string, Editor.TokenType | undefined> = {
    link: undefined,
    reference: undefined,
    classNames: undefined,
    index: undefined,
    equation: undefined,
    formula: undefined
  }
  const tokenTypes = token[1]
  if (!tokenTypes) return entities
  for (let i = 0; i < tokenTypes.length; i++) {
    const tokenType = tokenTypes[i]
    const mark = tokenType[0]
    switch (mark) {
      case Editor.InlineType.Link: {
        entities.link = tokenType
        break
      }
      case Editor.InlineType.Reference: {
        entities.reference = tokenType
        break
      }
      case Editor.InlineType.LocalClassnames: {
        entities.classNames = tokenType
        break
      }
      case Editor.InlineType.LocalIndex: {
        entities.index = tokenType
        break
      }
      case Editor.InlineType.Equation: {
        entities.equation = tokenType
        break
      }
      case Editor.InlineType.Formula: {
        entities.formula = tokenType
        break
      }
    }
  }

  return entities
}

export const getTransformedTypeAndPrefixLength = (
  tokens: Editor.Token[],
  changedLength: number,
  oldSelection: TellerySelection,
  lastChar: string
) => {
  if (isSelectionCollapsed(oldSelection) === false) return null
  if (changedLength !== 1) return null
  if (oldSelection.type !== TellerySelectionType.Inline) return null
  if (oldSelection.anchor.nodeIndex !== 0) return null
  if (oldSelection.anchor.offset >= 10) return null

  if (Object.keys(TOKEN_MAP).some((pattern) => pattern.endsWith(lastChar)) === false) {
    return null
  }

  const textBefore = tokens
    .slice(0, oldSelection.anchor.offset + 1)
    .map((token) => token[0])
    .join('')

  for (const pattern in TOKEN_MAP) {
    if (textBefore.startsWith(pattern)) {
      return [TOKEN_MAP[pattern].type, pattern.length]
    }
  }
  return null
}
