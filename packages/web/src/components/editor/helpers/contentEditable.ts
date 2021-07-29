import { Editor } from '@app/types'
import { dequal } from 'dequal'
import invariant from 'tiny-invariant'

export const saveSelection = function (containerEl: HTMLElement) {
  // const doc = containerEl.ownerDocument
  // const win = doc.defaultView
  // const range = win?.getSelection()?.getRangeAt(0)
  const _sel = document.getSelection()
  const range = _sel?.rangeCount && _sel?.getRangeAt(0)
  if (!range) {
    return null
  }
  const preSelectionRange = range.cloneRange()
  preSelectionRange.selectNodeContents(containerEl)
  preSelectionRange.setEnd(range.startContainer, range.startOffset)
  const start = preSelectionRange.toString().length
  return {
    start: start,
    end: start + range.toString().length
  }
}

export const restoreRange = function (range: Range | null) {
  const sel = window.getSelection()
  if (!sel || !range) return
  sel.removeAllRanges()
  sel.addRange(range)
}

export const restoreSelection = function (containerEl: HTMLElement | null, savedSel: { start: number; end: number }) {
  if (!containerEl) {
    return
  }
  const doc = containerEl.ownerDocument
  const win = doc.defaultView
  let charIndex = 0
  const range = doc.createRange()
  range.setStart(containerEl, 0)
  range.collapse(true)
  const nodeStack: Node[] = [containerEl]
  let node: Node | undefined
  let foundStart = false
  let stop = false
  while (!stop && (node = nodeStack.pop())) {
    if (!node) break
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharIndex = charIndex + (node as Text).length
      if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
        range.setStart(node, savedSel.start - charIndex)
        foundStart = true
      }
      if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
        range.setEnd(node, savedSel.end - charIndex)
        stop = true
      }
      charIndex = nextCharIndex
    } else {
      let i = node.childNodes.length
      while (i--) {
        nodeStack.push(node.childNodes[i])
      }
    }
  }

  const sel = win?.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

export const getFirstRange = () => {
  const _sel = document.getSelection()
  const _range = _sel?.rangeCount && _sel?.getRangeAt(0)
  if (!_range) {
    return null
  }
  return _range
}

export const getStringBeforeCaret = (target: HTMLElement | null) => {
  const _range = getFirstRange()
  if (!_range || !target) {
    return
  }
  const range = _range.cloneRange()
  range.selectNodeContents(target)
  range.setEnd(_range.endContainer, _range.endOffset)
  return range.toString()
}

export const getStringAfterCaret = (target: HTMLElement | null) => {
  const _range = getFirstRange()
  if (!_range || !target) {
    return
  }
  const range = _range.cloneRange()
  range.selectNodeContents(target)
  range.setEnd(_range.endContainer, _range.endOffset)
  return range.toString()
}

export const isCaretAtStart = (target: Element | null) => {
  const _range = getFirstRange()
  if (!_range || !target) {
    return
  }
  const range = _range.cloneRange()
  range.selectNodeContents(target)
  range.setEnd(_range.endContainer, _range.endOffset)
  return range.toString().length === 0
}

export const isCaretAtEnd = (target: Element | null) => {
  const _range = getFirstRange()
  if (!_range || !target) {
    return
  }
  const range = _range.cloneRange()
  range.selectNodeContents(target)
  range.setStart(_range.startContainer, _range.startOffset)
  const selectedString = range.toString()
  return selectedString.length === 0 || selectedString === '\n'
}

export const getElementEndPoint = (element: Node) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  return range.cloneRange()
}

export const getElementStartPoint = (element: Node) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(true)
  return range.cloneRange()
}

export const setCaretToEnd = (element: HTMLElement | null) => {
  const selection = window.getSelection()
  if (!selection || !element) {
    return
  }
  const endRange = getElementEndPoint(element)
  selection.removeAllRanges()
  selection.addRange(endRange)
  element.focus()
}

export const setCaretToStart = (element: HTMLElement | null) => {
  const selection = window.getSelection()
  if (!selection || !element) {
    return
  }
  const startRange = getElementStartPoint(element)
  selection.removeAllRanges()
  selection.addRange(startRange)
  element.focus()
}

export const getBlockElementContentEditbleById = (id: string) => {
  const node = document.querySelector(`[data-block-id='${id}'] [contenteditable='true']`)

  return node as HTMLElement | null
}

export const getBlockElementById = (id: string) => {
  const node = document.querySelector(`[data-block-id='${id}']`)

  invariant(node, `node ${id} not found`)
  return node as HTMLDivElement
}

export const getBlockImageById = (id: string) => {
  const node = document.querySelector(`[data-block-id='${id}'] .diagram`)
  // const node = document.querySelector(`[data-block-id='${id}']`)

  invariant(node, `node ${id} not found`)

  return node as HTMLElement
}

export const getBlockWrapElementById = (id: string | null, container?: HTMLElement) => {
  const element = container ?? document
  const node = element.querySelector(`[data-block-id='${id}']`)

  if (!node) {
    return null
  }
  return node as HTMLDivElement
}

export const selectToEnd = (target: HTMLDivElement | null) => {
  const _range = getFirstRange()
  if (!_range || !target) {
    return
  }
  const range = _range.cloneRange()
  range.selectNodeContents(target)
  range.setStart(_range.endContainer, _range.endOffset)
  const sel = document.getSelection()
  if (!sel) {
    return
  }
  sel.removeAllRanges()
  sel.addRange(range)
}

export const getSelectionFragment = () => {
  const sel = window.getSelection()
  const _sel = document.getSelection()
  if (!sel || !_sel?.rangeCount) {
    return
  }
  const range = sel.getRangeAt(0)
  const content = range.extractContents()
  const body = document.createElement('body')
  body.appendChild(content.cloneNode(true))
  return body as Element
}

export const deserializaToken = (el: Element, block: Editor.Block): Editor.Token => {
  if (el.nodeType === 3) {
    return [el.textContent as string]
  } else if (el.nodeType !== 1) {
    return ['']
  }

  switch (el.nodeName) {
    case 'BR':
      return ['\n']
    default: {
      const tokenIndexStr = (el as HTMLElement).dataset.tokenIndex
      if (tokenIndexStr) {
        const tokenIndex = parseInt(tokenIndexStr, 10)
        const token = block?.content?.title?.[tokenIndex]
        if (!token) return ['error']
        const hasReference = token[1] && token[1].some((marks) => marks[0] === Editor.InlineType.Reference)
        if (hasReference) {
          return [' ', token[1]]
        }
        return [el.textContent as string, token[1]]
      }
      return [el.textContent as string]
    }
  }
}

export const deserialize = (el: Element, block: Editor.Block): Editor.Token[] => {
  const childrenNodesArray = Array.from(el.childNodes)
  const children = childrenNodesArray.map((childnode) => deserializaToken(childnode as Element, block))

  if (el.tagName === 'BODY' || (el.nodeType === Node.ELEMENT_NODE && (el as HTMLElement).dataset.root)) {
    if (dequal(children[children.length - 1], ['\n'])) {
      return children.slice(0, children.length - 1)
    } else {
      return children
    }
  } else {
    return [['']]
  }
}
