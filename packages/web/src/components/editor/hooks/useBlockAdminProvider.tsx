import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { Editor } from '@app/types'
import { isArray } from 'lodash'
import React, { useCallback, useMemo, useRef, useContext, useEffect } from 'react'

import type { BlockInstanceInterface } from '../types'
import { useSetBlockLocalPreferences } from './useBlockLocalPreferences'

export const useBlockAdminProvider = (storyId: string) => {
  const blockInstanceRefs = useRef<
    Record<
      string,
      BlockInstanceInterface | ((value: BlockInstanceInterface | PromiseLike<BlockInstanceInterface>) => void)[]
    >
  >({})

  const storyBlocksMap = useStoryBlocksMap(storyId)
  const storyBlocksMapRef = useRef<typeof storyBlocksMap | null>(null)
  const setBlockPreferences = useSetBlockLocalPreferences()

  useEffect(() => {
    storyBlocksMapRef.current = storyBlocksMap
  }, [storyBlocksMap])

  const registerBlockInstance = useCallback((blockId: string, blockInstance?: BlockInstanceInterface) => {
    const currentValueOrResolves = blockInstanceRefs.current[blockId]
    if (!blockInstance) {
      delete blockInstanceRefs.current[blockId]
      return
    }

    if (currentValueOrResolves && isArray(currentValueOrResolves)) {
      currentValueOrResolves.forEach((resolve) => resolve(blockInstance))
    }
    blockInstanceRefs.current[blockId] = blockInstance
  }, [])

  const openToggledAncestors = useCallback(
    (blockId: string) => {
      console.log('openToggledAncestors', blockId)
      const currentSnapshot = storyBlocksMapRef.current
      if (!currentSnapshot) return
      let currentNodeId = blockId
      while (currentNodeId !== storyId) {
        const currentBlock = currentSnapshot[currentNodeId]
        if (!currentBlock) return
        if (currentBlock.type === Editor.BlockType.Toggle) {
          setBlockPreferences({ id: currentNodeId, key: 'toggle', value: false })
        }
        currentNodeId = currentBlock.parentId
        if (!currentBlock.parentId) return
      }
    },
    [setBlockPreferences, storyId]
  )

  const getBlockInstanceById = useCallback(
    (blockId: string) => {
      openToggledAncestors(blockId)
      return new Promise<BlockInstanceInterface>((resolve, reject) => {
        const currentValueOrResolves = blockInstanceRefs.current[blockId]
        if (!currentValueOrResolves) {
          blockInstanceRefs.current[blockId] = [resolve]
        } else {
          if (isArray(currentValueOrResolves)) {
            ;(blockInstanceRefs.current[blockId] as Function[]).push(resolve)
          } else {
            resolve(blockInstanceRefs.current[blockId] as BlockInstanceInterface)
          }
        }
      })
    },
    [openToggledAncestors]
  )

  return useMemo(() => ({ getBlockInstanceById, registerBlockInstance }), [getBlockInstanceById, registerBlockInstance])
}

export const BlockAdminContext = React.createContext<ReturnType<typeof useBlockAdminProvider> | null>(null)

export const useBlockAdmin = () => {
  return useContext(BlockAdminContext)
}
