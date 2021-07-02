import { atom, PrimitiveAtom } from 'jotai'
import React, { useEffect } from 'react'
import { useRecoilSnapshot } from 'recoil'

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

export const DebugObserver: React.FC = () => {
  const snapshot = useRecoilSnapshot()
  useEffect(() => {
    console.debug('The following atoms were modified:')
    for (const node of snapshot.getNodes_UNSTABLE({ isModified: true })) {
      if (node.key.includes('Hover') === false) {
        console.debug(node.key, snapshot.getLoadable(node))
      }
    }
  }, [snapshot])

  return null
}
