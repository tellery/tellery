import { getBlockElementContentEditbleById } from '@app/components/editor/helpers/contentEditable'
import {
  getTokensLength,
  splitedTokenPosition2TokenPosition,
  tokenPosition2SplitedTokenPosition
} from '@app/components/editor/helpers/tokenManipulation'
import debug from 'debug'
import { BlockSnapshot, getBlockFromSnapshot } from '@app/store/block'
import type { Editor } from '@app/types'
import { TellerySelection, TellerySelectionType } from '.'
import { isTextBlock } from '../Blocks/utils'
const logger = debug('tellery:editor:helper')

export const getEndContainerFromPoint = (x: number, y: number) => {
  const range = getRangeFromPoint(x, y)

  return range?.endContainer
}

export const getStartContainerFromPoint = (x: number, y: number) => {
  const range = getRangeFromPoint(x, y)
  return range?.startContainer
}

export const getRangeFromPoint = (x: number, y: number) => {
  // https://developer.mozilla.org/zh-CN/docs/Web/API/Document/caretRangeFromPoint
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y)
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y)
    if (position) {
      const range = document.createRange()
      range.setStart(position.offsetNode, position.offset)
      range.setEnd(position.offsetNode, position.offset)
      return range
    }
  }
  return null
}

export const findNearestBlockWithFilter = (
  blockId: string,
  snapshot: BlockSnapshot,
  filter: (block: Editor.Block) => boolean
): Editor.Block | null => {
  const block = getBlockFromSnapshot(blockId, snapshot)
  if (filter(block)) {
    return block
  } else {
    if (!block.children?.length) {
      return null
    }
    const firstChild = block.children[0]
    return findNearestBlockWithFilter(firstChild, snapshot, filter)
  }
}

export const findDeepestBlockWithFilter = (
  blockId: string,
  snapshot: BlockSnapshot,
  filter: (block: Editor.Block) => boolean
): Editor.Block | null => {
  const block = getBlockFromSnapshot(blockId, snapshot)
  if (!block.children?.length) {
    return filter(block) ? block : null
  }
  const lastChild = block.children[block.children.length - 1]
  return findDeepestBlockWithFilter(lastChild, snapshot, filter)
}

export const findPreviousTextBlock = (blockId: string, snapshot: BlockSnapshot) => {
  const block = getBlockFromSnapshot(blockId, snapshot)
  const parentBlock = getBlockFromSnapshot(block.parentId, snapshot)
  const index = parentBlock.children!.findIndex((id) => id === blockId)
  for (let i = index - 1; i >= 0; i--) {
    const deepestTextBlock = findDeepestBlockWithFilter(parentBlock.children![i], snapshot, (block) =>
      isTextBlock(block.type)
    )
    if (deepestTextBlock) {
      return deepestTextBlock
    }
  }
  if (block.parentId !== block.storyId) {
    if (isTextBlock(parentBlock.type)) {
      return parentBlock
    }
  }
  return null
}

export const findNextTextBlock = (
  blockId: string,
  snapshot: BlockSnapshot,
  skipChildren: boolean = false
): Editor.BaseBlock | null => {
  const block = getBlockFromSnapshot(blockId, snapshot)
  const parentBlock = getBlockFromSnapshot(block.parentId, snapshot)
  const index = parentBlock.children!.findIndex((id) => id === blockId)

  // first, look for it's children
  if (block.children?.length && skipChildren === false) {
    for (let i = 0; i < block.children.length; i++) {
      const nreaestBlock = findNearestBlockWithFilter(block.children[i], snapshot, (block) => isTextBlock(block.type))
      if (nreaestBlock && nreaestBlock.id !== blockId) {
        return nreaestBlock
      }
    }
  }

  // then, look for the block next to it
  for (let i = index + 1; i < parentBlock.children!.length; i++) {
    const nreaestBlock = findNearestBlockWithFilter(parentBlock.children![i], snapshot, (block) =>
      isTextBlock(block.type)
    )
    if (nreaestBlock) {
      return nreaestBlock
    }
  }

  if (block.parentId !== block.storyId) {
    return findNextTextBlock(parentBlock.id, snapshot, true)
  }

  return null
}

export const getPreviousTextBlockElement = (blockId: string, snapshot: BlockSnapshot) => {
  const previousTextBlock = findPreviousTextBlock(blockId, snapshot)
  if (previousTextBlock) {
    // logger('find previous text block', getBlockElementContentEditbleById(previousTextBlock.id))
    return getBlockElementContentEditbleById(previousTextBlock.id)
  }
  return null
}

export const getNextTextBlockElement = (blockId: string, snapshot: BlockSnapshot) => {
  const nextTextBlock = findNextTextBlock(blockId, snapshot)
  if (nextTextBlock) {
    return getBlockElementContentEditbleById(nextTextBlock.id)
  }
  return null
}

export const getTransformedSelection = (
  selectionState: TellerySelection,
  oldTokens: Editor.Token[],
  newTokens: Editor.Token[]
) => {
  if (selectionState.type === TellerySelectionType.Block) {
    return selectionState as TellerySelection
  }
  const blockId = selectionState.anchor.blockId

  const oldAnchor = selectionState.anchor
  const oldFocus = selectionState.focus
  const changedLength = getTokensLength(newTokens) - getTokensLength(oldTokens)
  logger(
    'getTransformedSelection',
    oldTokens,
    oldAnchor.nodeIndex,
    oldAnchor.offset,
    tokenPosition2SplitedTokenPosition(oldTokens, oldAnchor.nodeIndex, oldAnchor.offset) ?? 0
  )

  const anchorOffset =
    (tokenPosition2SplitedTokenPosition(oldTokens, oldAnchor.nodeIndex, oldAnchor.offset) ?? 0) + changedLength
  const focusOffset =
    (tokenPosition2SplitedTokenPosition(oldTokens, oldFocus.nodeIndex, oldFocus.offset) ?? 0) + changedLength
  const newAnchor = splitedTokenPosition2TokenPosition(newTokens, anchorOffset)
  const newFocus = splitedTokenPosition2TokenPosition(newTokens, focusOffset)

  // logger('getTransformedSelection', selectionState, anchorOffset, focusOffset, changedLength, newAnchor, newFocus)
  return {
    type: TellerySelectionType.Inline,
    anchor: {
      blockId: blockId,
      nodeIndex: changedLength >= 0 ? newAnchor[0] : newFocus[0],
      offset: changedLength >= 0 ? newAnchor[1] : newFocus[1]
    },
    focus: {
      blockId: blockId,
      nodeIndex: newFocus[0],
      offset: newFocus[1]
    },
    storyId: selectionState.storyId
  } as TellerySelection
}

export const findRootBlock = (node: Node) => {
  let root: null | Node = node
  while (true) {
    if (root === null) {
      return null
    }
    if (root.nodeType === Node.ELEMENT_NODE && (root as HTMLElement)?.dataset?.blockId) {
      return root as HTMLElement
    }
    root = root.parentElement
  }
}
