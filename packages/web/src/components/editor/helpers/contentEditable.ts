import type { Editor } from '@app/types'
import { TelleryGlyph } from '@app/utils'
import { dequal } from 'dequal'
import invariant from 'tiny-invariant'
import { isNonSelectbleToken } from '.'
import { extractEntitiesFromToken } from './tokenManipulation'

export const saveSelection = function (containerEl: HTMLElement) {
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

export const deserialize = (el: Element, block: Editor.BaseBlock): Editor.Token[] => {
  const node = el
  const childrenNodeArray = Array.from(node.childNodes)
  const children: Editor.Token[] = []

  for (let i = 0; i < childrenNodeArray.length; i++) {
    const currentNode = childrenNodeArray[i]
    if (currentNode.nodeType === Node.TEXT_NODE) {
      children.push([currentNode.textContent as string])
      continue
    } else if (currentNode.nodeType !== Node.ELEMENT_NODE) {
      children.push([''])
      continue
    }

    switch (currentNode.nodeName) {
      case 'BR': {
        children.push(['\n'])
        break
      }
      default: {
        const tokenIndexStr = (currentNode as HTMLElement).dataset.tokenIndex
        if (tokenIndexStr) {
          const tokenIndex = parseInt(tokenIndexStr, 10)
          const token = block?.content?.title?.[tokenIndex]
          invariant(token, 'token is undefined')

          const entities = extractEntitiesFromToken(token)

          if (entities.reference) {
            children.push([TelleryGlyph.BI_LINK, token[1]])
            break
          } else if (entities.formula) {
            children.push([TelleryGlyph.EQUATION, token[1]])
            break
          }

          if (children[i]) {
            children[i] = [(children[i][0] + currentNode.textContent) as string, token[1]]
          } else {
            children.push([currentNode.textContent as string, token[1]])
          }
          break
        }
        children.push([currentNode.textContent as string])
        break
      }
    }
  }

  if (el.tagName === 'BODY' || (el.nodeType === Node.ELEMENT_NODE && (el as HTMLElement).dataset.root)) {
    if (dequal(children[children.length - 1], ['\n'])) {
      const previousToken = children[children.length - 2]
      if (previousToken && isNonSelectbleToken(previousToken)) {
        return children.slice(0, children.length - 1)
      }
      return children
    } else {
      return children
    }
  } else {
    return [['']]
  }
}
