import invariant from 'tiny-invariant'
import type { Editor } from '@app/types'
import { FIRST_LINE_OR_LAST_LINE_THERESHOLD } from '@app/utils'
import {
  getBlockElementContentEditbleById,
  getElementEndPoint,
  getElementStartPoint,
  restoreSelection,
  saveSelection
} from './contentEditable'
import { isSelectionAtStart } from './tokenManipulation'

export type TellerySelectionNode = {
  blockId: string
  nodeIndex: number
  offset: number
}

export enum TellerySelectionType {
  Inline,
  Block
}

export type TelleryBlockSelection = {
  type: TellerySelectionType.Block
  selectedBlocks: string[]
}

export type TelleryInlineSelection = {
  type: TellerySelectionType.Inline
  focus: TellerySelectionNode
  anchor: TellerySelectionNode
}

export type TellerySelection = (TelleryBlockSelection | TelleryInlineSelection) & { storyId: string }

const getNodeContentOffset = (child: Node, node: Node) => {
  let nodeOffset = 0
  const visitor = (node: Node | null) => {
    if (node && node.textContent) {
      nodeOffset += node.textContent.length
    }
  }
  const traverse = (node: Node | null, target: Node | null) => {
    if (!node) return
    if (node === target) return
    let i = node.childNodes.length
    while (i--) {
      traverse(node.childNodes[i], target)
    }
    if (i === 0) {
      visitor(node)
    }
  }
  traverse(child, node)
  return nodeOffset
}

const findNodePositionAndOffset = (node: Node, offset: number) => {
  let root: HTMLElement = node as HTMLElement

  while (true) {
    if (root && root.nodeType === Node.ELEMENT_NODE && (root as HTMLElement)?.dataset.root) {
      break
    }
    if (root.parentElement) {
      root = root.parentElement
    } else {
      break
    }
  }

  const childIter = root.childNodes.values()
  if (node === root) {
    return [offset, 0]
  }
  let i = -1
  let tokenAccOffset = 0
  while (true) {
    const iterRes = childIter.next()
    if (iterRes.done) {
      break
    }
    const child = iterRes.value as HTMLElement

    const tokenIndex = child.dataset?.tokenIndex ? parseInt(child.dataset?.tokenIndex) : i + 1
    if (tokenIndex !== i) {
      i = tokenIndex
      tokenAccOffset = 0
    }

    if (child === node) {
      return [i, offset]
    }
    if (child?.contains?.(node)) {
      const accOffset = offset + tokenAccOffset + getNodeContentOffset(child, node)
      return [i, accOffset]
    } else {
      tokenAccOffset += child.textContent?.length ?? 0
    }
  }

  if (offset === 0) {
    return [0, 0]
  } else {
    return [i, 0]
  }
}

export const nativeSelection2Tellery = (block: Editor.Block): TellerySelection | null => {
  const _sel = document.getSelection()
  const range = _sel?.rangeCount && _sel?.getRangeAt(0)
  if (!range) {
    return null
  }
  const anchorInfo = findNodePositionAndOffset(range.startContainer, range.startOffset)
  const focusInfo = findNodePositionAndOffset(range.endContainer, range.endOffset)

  invariant(anchorInfo[0] !== -1, 'node index is -1')
  invariant(focusInfo[0] !== -1, 'node index is -1')

  return {
    type: TellerySelectionType.Inline,
    anchor: {
      blockId: block.id,
      nodeIndex: anchorInfo[0],
      offset: anchorInfo[1]
    },
    focus: {
      blockId: block.id,
      nodeIndex: focusInfo[0],
      offset: focusInfo[1]
    },
    storyId: block.storyId!
  }
}

const findNodesAtIndex = (container: HTMLElement, index: number, offset: number) => {
  const defaultResult = {
    node: container,
    offset: index
  }

  const tokenElements: HTMLElement[] = []
  const childNodes = [...container.childNodes]
  let currentIndex = -1
  for (let i = 0; i < childNodes.length; i++) {
    const currentNode = childNodes[i] as HTMLElement
    const tokenIndex = currentNode.dataset?.tokenIndex ? parseInt(currentNode.dataset?.tokenIndex) : currentIndex + 1
    if (tokenIndex === index) {
      tokenElements.push(currentNode)
    } else {
      currentIndex = tokenIndex
    }

    if (currentIndex > index) break
  }

  if (tokenElements.length === 0) {
    return defaultResult
  }
  const nodeStack = tokenElements
  const resultNodes: HTMLElement[] = []
  let node

  while ((node = nodeStack.shift())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as HTMLElement).getAttribute('contenteditable') === 'false') {
        return defaultResult
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      resultNodes.push(node)
    } else {
      let i = node.childNodes.length
      while (i--) {
        nodeStack.unshift(node.childNodes[i] as HTMLElement)
      }
    }
  }

  if (resultNodes.length === 0) {
    return defaultResult
  }

  let accOffset = 0
  while (resultNodes.length) {
    const currentNode = resultNodes.shift()!
    const currentNodeLength = currentNode?.textContent?.length ?? 0
    if (accOffset + currentNodeLength >= offset) {
      return {
        node: currentNode,
        offset: offset - accOffset
      }
    } else {
      accOffset += currentNodeLength
    }
  }

  return defaultResult
}

export const tellerySelection2Native = (sel?: TellerySelection): Range | null => {
  if (!sel) {
    return null
  }

  if (sel.type === TellerySelectionType.Block) {
    return null
  }

  const containerEl = getBlockElementContentEditbleById(sel.anchor.blockId)
  if (!containerEl) {
    return null
  }

  if (isSelectionAtStart(sel)) {
    return getElementStartPoint(containerEl)
  }

  const doc = containerEl.ownerDocument
  const range = doc.createRange()
  const start = findNodesAtIndex(containerEl, sel.anchor.nodeIndex, sel.anchor.offset)

  range.setStart(start.node, start.offset)
  const end = findNodesAtIndex(containerEl, sel.focus.nodeIndex, sel.focus.offset)
  range.setEnd(end.node, end.offset)

  if (start.node === end.node && start.node === containerEl) {
    return getElementEndPoint(containerEl)
  }

  return range
}

class SelectionManager {
  range: { start: number; end: number } | null

  container: HTMLDivElement | null = null

  history: {
    range: { start: number; end: number } | null
    container: HTMLDivElement
  }[]

  constructor() {
    this.range = null
    this.history = []
  }

  save(container: HTMLDivElement) {
    this.container = container
    this.range = saveSelection(container)
    this.history.push({ container: this.container, range: this.range })
  }

  getHistoryRecord(index: number) {
    const targetIndex = this.history.length - (index + 1)
    if (targetIndex >= this.history.length) return null
    return this.history[targetIndex]
  }

  get() {
    return {
      range: this.range,
      container: this.container
    }
  }

  set(container: HTMLDivElement | null, range: { start: number; end: number }) {
    this.container = container
    this.range = range
  }

  restore() {
    this.range && this.container && restoreSelection(this.container, this.range)
    this.range = null
    this.container = null
  }
}

export const isSelectionAtFirstLine = (selection: Selection, blockElement: Element) => {
  const range = selection.getRangeAt(0).cloneRange()
  if (!range) return false
  const currentBlockRect = blockElement.getBoundingClientRect()
  // if contenteditable is empty, rects will be null, getBoundingClientRect will get zero values
  const rects = range.getClientRects()
  if (!rects.length) {
    return true
  }
  const selectionRect = range.getBoundingClientRect()
  return Math.abs(selectionRect.y - currentBlockRect.y) < FIRST_LINE_OR_LAST_LINE_THERESHOLD
}

export const isSelectionAtLastLine = (selection: Selection, blockElement: Element) => {
  const range = selection.getRangeAt(0).cloneRange()
  if (!range) return false
  const currentBlockRect = blockElement.getBoundingClientRect()
  // if contenteditable is empty, rects will be null, getBoundingClientRect will get zero values
  const rects = range.getClientRects()
  if (!rects.length) {
    return true
  }
  const selectionRect = range.getBoundingClientRect()
  return Math.abs(selectionRect.bottom - currentBlockRect.bottom) < FIRST_LINE_OR_LAST_LINE_THERESHOLD
}

export const selectionManager = new SelectionManager()
