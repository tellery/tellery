import { atom, PrimitiveAtom } from 'jotai'

export const editorCreateNewBlockPopoverStateStore: Record<string, PrimitiveAtom<boolean>> = {}

export const editorCreateNewBlockPopoverState = (id: string = '') => {
  if (editorCreateNewBlockPopoverStateStore[id] === undefined) {
    editorCreateNewBlockPopoverStateStore[id] = atom(false) as PrimitiveAtom<boolean>
  }
  return editorCreateNewBlockPopoverStateStore[id]
}

export const editorTransformBlockPopoverStateStore: Record<string, PrimitiveAtom<boolean>> = {}

export const editorTransformBlockPopoverState = (id: string = '') => {
  if (!editorTransformBlockPopoverStateStore[id]) {
    editorTransformBlockPopoverStateStore[id] = atom(false) as PrimitiveAtom<boolean>
  }
  return editorTransformBlockPopoverStateStore[id]
}

export const blockSQLLoadingStateStore: Record<string, PrimitiveAtom<boolean>> = {}

export const blockSQLLoadingState = (id: string = '') => {
  if (blockSQLLoadingStateStore[id] === undefined) {
    blockSQLLoadingStateStore[id] = atom(false) as PrimitiveAtom<boolean>
  }
  return blockSQLLoadingStateStore[id]
}

export const omniboxShowState = atom(false)
