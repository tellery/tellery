import invariant from 'invariant'
import type { Editor } from 'types'
import { FIRST_LINE_OR_LAST_LINE_THERESHOLD } from 'utils'
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
  let i = 0
  if (node === root) {
    return [offset, 0]
  }
  while (true) {
    const iterRes = childIter.next()
    if (iterRes.done) {
      break
    }
    const child = iterRes.value as HTMLElement
    if (child === node) {
      return [i, offset]
    }
    if (child?.contains?.(node)) {
      let accOffset = offset
      const visitor = (node: Node | null) => {
        if (node && node.textContent) {
          accOffset += node.textContent.length
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
      return [i, accOffset]
    }
    i++
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

const findNodeAtIndex = (container: HTMLElement, index: number) => {
  const tokenElement = container.childNodes.item(index)
  if (!tokenElement) {
    return container
  }
  const nodeStack = [tokenElement]
  let node

  while ((node = nodeStack.pop())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as HTMLElement).getAttribute('contenteditable') === 'false') {
        return null
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return node
    } else {
      let i = node.childNodes.length
      while (i--) {
        nodeStack.push(node.childNodes[i])
      }
    }
  }

  return container
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
  const startNode = findNodeAtIndex(containerEl, sel.anchor.nodeIndex)
  if (startNode === null) {
    range.setStart(containerEl, sel.anchor.nodeIndex)
  } else {
    range.setStart(startNode, sel.anchor.offset)
  }
  const endNode = findNodeAtIndex(containerEl, sel.focus.nodeIndex)
  if (endNode === null) {
    range.setEnd(containerEl, sel.focus.nodeIndex)
  } else {
    range.setEnd(endNode, sel.focus.offset)
  }

  if (startNode === endNode && startNode === containerEl) {
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
